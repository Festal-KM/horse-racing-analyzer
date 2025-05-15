import asyncio
import logging
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple
import re

import httpx
from bs4 import BeautifulSoup
from sqlmodel import Session, select

from app.config import JRA_BASE_URL, MAX_RETRY_COUNT, REQUEST_TIMEOUT
from app.models import Race, Horse, HorsePastRace

logger = logging.getLogger(__name__)


class JRAScraper:
    """JRAデータスクレイピングサービス"""
    
    def __init__(self, db_session: Session):
        self.session = db_session
        self.client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
    
    async def close(self):
        await self.client.aclose()
    
    async def sync_race_data(self, target_date: date, force: bool = False) -> Dict:
        """指定日付のレースデータを同期する"""
        try:
            logger.info(f"同期開始: {target_date}, 強制モード: {force}")
            
            # 同期済みかチェック (強制モードでない場合)
            if not force:
                existing_races = self.session.exec(
                    select(Race).where(Race.race_date == target_date)
                ).all()
                
                if existing_races:
                    logger.info(f"同期スキップ - すでに{len(existing_races)}レースのデータが存在します")
                    return {"status": "skipped", "message": "データはすでに存在します"}
            
            # 対象日のレース一覧を取得
            races_list = await self._fetch_races_list(target_date)
            
            if not races_list:
                return {"status": "no_data", "message": f"{target_date}のレースは見つかりませんでした"}
            
            results = []
            # それぞれのレースの詳細を取得して保存
            for race_info in races_list:
                race_id = race_info["race_id"]
                venue = race_info["venue"]
                race_number = race_info["race_number"]
                
                try:
                    # レース詳細取得
                    race_detail = await self._fetch_race_detail(race_id, venue, race_number, target_date)
                    
                    # オッズ情報取得
                    odds_data = await self._fetch_odds(race_id, venue, race_number)
                    
                    # データを保存
                    self._save_race_data(race_detail, odds_data)
                    
                    results.append({
                        "race_id": race_id,
                        "status": "success"
                    })
                except Exception as e:
                    logger.error(f"レース {race_id} 同期エラー: {str(e)}", exc_info=True)
                    results.append({
                        "race_id": race_id,
                        "status": "error",
                        "message": str(e)
                    })
            
            success_count = sum(1 for r in results if r["status"] == "success")
            
            return {
                "status": "success" if success_count > 0 else "partial_failure",
                "message": f"{success_count}/{len(races_list)}レースのデータを同期しました",
                "details": results
            }
            
        except Exception as e:
            logger.error(f"同期エラー: {str(e)}", exc_info=True)
            raise
        finally:
            await self.close()
    
    async def _fetch_races_list(self, target_date: date) -> List[Dict]:
        """指定日付のレース一覧を取得"""
        # JRAのレース一覧URLを構築
        date_str = target_date.strftime("%Y%m%d")
        url = f"{JRA_BASE_URL}/race_list.html?kaisai_date={date_str}"
        
        # リトライ処理を含むHTTPリクエスト
        for attempt in range(MAX_RETRY_COUNT):
            try:
                response = await self.client.get(url)
                response.raise_for_status()
                break
            except httpx.HTTPError as e:
                if attempt == MAX_RETRY_COUNT - 1:
                    logger.error(f"レース一覧の取得に失敗: {str(e)}")
                    raise
                await asyncio.sleep(1)
        
        # HTMLパース
        soup = BeautifulSoup(response.text, "html.parser")
        races = []
        
        # レース一覧テーブルからデータ抽出
        race_tables = soup.select(".race_table")
        for table in race_tables:
            venue_elem = table.select_one(".race_place")
            if not venue_elem:
                continue
                
            venue = venue_elem.text.strip()
            
            race_rows = table.select("tr.race_data")
            for row in race_rows:
                race_link = row.select_one("a")
                if not race_link:
                    continue
                    
                href = race_link.get("href", "")
                race_id_match = re.search(r"race_id=([0-9]+)", href)
                if not race_id_match:
                    continue
                    
                race_id = race_id_match.group(1)
                race_number_text = row.select_one(".race_num").text.strip()
                race_number_match = re.search(r"(\d+)R", race_number_text)
                race_number = int(race_number_match.group(1)) if race_number_match else 0
                
                races.append({
                    "race_id": race_id,
                    "venue": venue,
                    "race_number": race_number
                })
        
        return races
    
    async def _fetch_race_detail(self, race_id: str, venue: str, race_number: int, race_date: date) -> Dict:
        """レース詳細情報を取得"""
        # レース詳細URLを構築
        url = f"{JRA_BASE_URL}/race/result.html?race_id={race_id}"
        
        # リトライ処理を含むHTTPリクエスト
        for attempt in range(MAX_RETRY_COUNT):
            try:
                response = await self.client.get(url)
                response.raise_for_status()
                break
            except httpx.HTTPError as e:
                if attempt == MAX_RETRY_COUNT - 1:
                    logger.error(f"レース詳細の取得に失敗: {str(e)}")
                    raise
                await asyncio.sleep(1)
        
        # HTMLパース
        soup = BeautifulSoup(response.text, "html.parser")
        
        # レース情報抽出
        race_name_elem = soup.select_one(".race_name")
        race_name = race_name_elem.text.strip() if race_name_elem else f"{venue}{race_number}レース"
        
        # レース条件抽出
        race_info_elem = soup.select_one(".race_condition")
        race_info_text = race_info_elem.text.strip() if race_info_elem else ""
        
        # コース情報抽出
        course_match = re.search(r"(芝|ダート)(\d+)m", race_info_text)
        course_type = course_match.group(1) if course_match else "不明"
        distance = int(course_match.group(2)) if course_match else 0
        
        # クラス情報抽出
        class_match = re.search(r"(G\d|新馬|未勝利|\d勝クラス|オープン|\d+万下)", race_info_text)
        race_class = class_match.group(1) if class_match else "一般"
        
        # 天候・馬場状態抽出
        condition_elem = soup.select_one(".race_condition")
        condition_text = condition_elem.text.strip() if condition_elem else ""
        
        weather_match = re.search(r"天候:(\w+)", condition_text)
        weather = weather_match.group(1) if weather_match else "不明"
        
        track_match = re.search(r"馬場:(\w+)", condition_text)
        track_condition = track_match.group(1) if track_match else "不明"
        
        # 発走時刻抽出
        time_elem = soup.select_one(".race_time")
        time_text = time_elem.text.strip() if time_elem else ""
        time_match = re.search(r"(\d+):(\d+)", time_text)
        
        start_time = None
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            start_time = datetime.combine(race_date, datetime.strptime(f"{hour}:{minute}", "%H:%M").time())
        
        # 出走馬情報抽出
        horses = []
        horse_table = soup.select_one(".race_table_01")
        if horse_table:
            horse_rows = horse_table.select("tr")[1:]  # ヘッダー行をスキップ
            for row in horse_rows:
                cols = row.select("td")
                if len(cols) < 4:
                    continue
                
                horse_number = int(cols[1].text.strip()) if cols[1].text.strip().isdigit() else 0
                horse_name_elem = cols[3].select_one("a")
                horse_name = horse_name_elem.text.strip() if horse_name_elem else ""
                horse_id_match = re.search(r"horse_id=([0-9]+)", horse_name_elem.get("href", "")) if horse_name_elem else None
                horse_id = horse_id_match.group(1) if horse_id_match else ""
                
                jockey_elem = cols[6].select_one("a")
                jockey = jockey_elem.text.strip() if jockey_elem else ""
                
                weight_text = cols[8].text.strip() if len(cols) > 8 else ""
                weight_match = re.search(r"(\d+)", weight_text)
                weight = int(weight_match.group(1)) if weight_match else 0
                
                trainer_elem = cols[10].select_one("a") if len(cols) > 10 else None
                trainer = trainer_elem.text.strip() if trainer_elem else ""
                
                # 過去レースは別APIで取得が必要になるため、ここではダミーデータを設定
                past_races = []
                
                horses.append({
                    "horse_id": horse_id,
                    "horse_name": horse_name,
                    "horse_number": horse_number,
                    "jockey": jockey,
                    "trainer": trainer,
                    "weight": weight,
                    "past_races": past_races
                })
        
        return {
            "race_id": race_id,
            "race_date": race_date,
            "venue": venue,
            "race_number": race_number,
            "race_name": race_name,
            "race_class": race_class,
            "course_type": course_type,
            "distance": distance,
            "weather": weather,
            "track_condition": track_condition,
            "start_time": start_time,
            "horses": horses
        }
    
    async def _fetch_odds(self, race_id: str, venue: str, race_number: int) -> Dict:
        """オッズ情報を取得"""
        # オッズ情報のURLを構築
        url = f"{JRA_BASE_URL}/odds/index.html?race_id={race_id}"
        
        # リトライ処理を含むHTTPリクエスト
        for attempt in range(MAX_RETRY_COUNT):
            try:
                response = await self.client.get(url)
                response.raise_for_status()
                break
            except httpx.HTTPError as e:
                if attempt == MAX_RETRY_COUNT - 1:
                    logger.error(f"オッズ情報の取得に失敗: {str(e)}")
                    return {"win_odds": {}}  # エラー時は空のオッズを返す
                await asyncio.sleep(1)
        
        # HTMLパース
        soup = BeautifulSoup(response.text, "html.parser")
        
        # 単勝オッズの抽出
        win_odds = {}
        odds_table = soup.select_one(".odds_table_01")
        if odds_table:
            odds_rows = odds_table.select("tr")[1:]  # ヘッダー行をスキップ
            for row in odds_rows:
                cols = row.select("td")
                if len(cols) < 3:
                    continue
                
                horse_number_text = cols[0].text.strip()
                if not horse_number_text.isdigit():
                    continue
                    
                horse_number = int(horse_number_text)
                odds_text = cols[2].text.strip().replace(",", "")
                
                try:
                    odds_value = float(odds_text)
                    win_odds[horse_number] = odds_value
                except ValueError:
                    pass
        
        return {"win_odds": win_odds}
    
    def _save_race_data(self, race_detail: Dict, odds_data: Dict):
        """レース情報をデータベースに保存"""
        # レース情報を登録/更新
        race_data = {k: v for k, v in race_detail.items() if k != "horses"}
        
        # 既存レースを検索
        existing_race = self.session.exec(
            select(Race).where(Race.race_id == race_data["race_id"])
        ).first()
        
        if existing_race:
            # 更新
            for key, value in race_data.items():
                setattr(existing_race, key, value)
            race = existing_race
        else:
            # 新規作成
            race = Race(**race_data)
            self.session.add(race)
        
        self.session.commit()
        self.session.refresh(race)
        
        # 馬情報を登録/更新
        horses_data = race_detail.get("horses", [])
        for horse_data in horses_data:
            past_races = horse_data.pop("past_races", [])
            horse_data["race_id"] = race.id
            
            # 既存の馬を検索
            existing_horse = self.session.exec(
                select(Horse).where(
                    Horse.race_id == race.id,
                    Horse.horse_id == horse_data["horse_id"]
                )
            ).first()
            
            if existing_horse:
                # 更新
                for key, value in horse_data.items():
                    setattr(existing_horse, key, value)
                horse = existing_horse
            else:
                # 新規作成
                horse = Horse(**horse_data)
                self.session.add(horse)
            
            self.session.commit()
            self.session.refresh(horse)
            
            # オッズ情報を更新
            win_odds = odds_data.get("win_odds", {}).get(horse.horse_number)
            if win_odds:
                horse.odds = win_odds
                self.session.add(horse)
            
            # 過去レース情報を登録
            for past_race_data in past_races:
                past_race = HorsePastRace(
                    horse_id=horse.id,
                    **past_race_data
                )
                self.session.add(past_race)
            
            self.session.commit() 