#!/usr/bin/env node

/**
 * フロントエンドセキュリティチェックスクリプト
 * npm依存パッケージの脆弱性をチェックし、レポートを生成します。
 * npm auditおよびsnykを使用します。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { program } = require('commander');

// 現在時刻の取得
const now = new Date();
const timestamp = now.toISOString();

/**
 * ロギング設定
 */
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARNING] ${message}`)
};

/**
 * セキュリティチェック実行クラス
 */
class SecurityChecker {
  /**
   * 初期化
   * @param {string} projectDir - チェック対象のプロジェクトディレクトリ
   */
  constructor(projectDir) {
    this.projectDir = path.resolve(projectDir);
    this.outputDir = path.join(this.projectDir, 'security_reports');
    this.results = {
      timestamp,
      projectDir: this.projectDir,
      npmAudit: null,
      snyk: null,
      eslint: null
    };

    // 出力ディレクトリがなければ作成
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * npm auditを使用して依存パッケージの脆弱性をチェック
   * @returns {Object} 脆弱性チェック結果
   */
  checkNpmAudit() {
    logger.info('npm auditによる依存パッケージの脆弱性チェックを開始します');

    // package.jsonが存在するか確認
    const packageJsonPath = path.join(this.projectDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logger.error(`package.jsonファイルが見つかりません: ${packageJsonPath}`);
      return { error: 'package.json not found' };
    }

    try {
      // npm auditを実行してJSON形式で結果を取得
      const npmAuditOutputPath = path.join(this.outputDir, 'npm_audit_report.json');

      const npmAuditCmd = 'npm audit --json';
      const auditOutput = execSync(npmAuditCmd, {
        cwd: this.projectDir,
        encoding: 'utf8'
      });

      // JSON形式で出力を保存
      fs.writeFileSync(npmAuditOutputPath, auditOutput);
      const auditData = JSON.parse(auditOutput);

      // 結果の整形
      const vulnerabilities = [];
      let totalVulnerabilities = 0;

      // npm audit v6以降の形式
      if (auditData.vulnerabilities) {
        for (const [packageName, details] of Object.entries(auditData.vulnerabilities)) {
          if (details.via) {
            // 直接の脆弱性がある場合
            vulnerabilities.push({
              package: packageName,
              installedVersion: details.version,
              vulnerableVersions: details.range,
              severity: details.severity,
              recommendation: details.fixAvailable ? `npm upgrade ${packageName}` : 'No direct fix available',
              description: Array.isArray(details.via) 
                ? details.via.filter(v => typeof v === 'object').map(v => v.title || v.url).join(', ')
                : typeof details.via === 'object' ? details.via.title || details.via.url : details.via,
              fixAvailable: !!details.fixAvailable
            });
            totalVulnerabilities++;
          }
        }
      } 
      // 古い形式のnpm auditデータ
      else if (auditData.advisories) {
        for (const [id, advisory] of Object.entries(auditData.advisories)) {
          vulnerabilities.push({
            package: advisory.module_name,
            installedVersion: advisory.findings[0]?.version || 'unknown',
            vulnerableVersions: advisory.vulnerable_versions,
            severity: advisory.severity,
            recommendation: advisory.recommendation,
            description: advisory.title,
            fixAvailable: advisory.findings[0]?.fixAvailable || false,
            url: advisory.url
          });
          totalVulnerabilities++;
        }
      }

      // 深刻度別の脆弱性数
      const severityCounts = {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0
      };

      vulnerabilities.forEach(vuln => {
        const severity = vuln.severity.toLowerCase();
        if (severityCounts[severity] !== undefined) {
          severityCounts[severity]++;
        }
      });

      const result = {
        scanSuccessful: true,
        vulnerabilitiesFound: totalVulnerabilities,
        vulnerabilities,
        severityCounts,
        reportFile: npmAuditOutputPath,
        summary: auditData.metadata || {}
      };

      logger.info(`npm auditのチェックが完了しました。脆弱性: ${totalVulnerabilities}件`);
      return result;

    } catch (e) {
      logger.error(`npm auditチェック中にエラーが発生しました: ${e.message}`);
      return {
        scanSuccessful: false,
        error: e.message
      };
    }
  }

  /**
   * Snykを使用して依存パッケージの脆弱性をチェック（オプション）
   * @returns {Object} 脆弱性チェック結果
   */
  checkSnyk() {
    logger.info('Snykによる依存パッケージの脆弱性チェックを開始します');

    // Snyk CLIがインストールされているか確認
    try {
      execSync('snyk --version', { stdio: 'pipe' });
    } catch (e) {
      logger.warn('Snyk CLIがインストールされていません。`npm install -g snyk`でインストールすることで追加チェックが可能です。');
      return { error: 'Snyk CLI not installed' };
    }

    try {
      // Snykを実行してJSON形式で結果を取得
      const snykOutputPath = path.join(this.outputDir, 'snyk_report.json');

      const snykCmd = 'snyk test --json';
      
      try {
        const snykOutput = execSync(snykCmd, {
          cwd: this.projectDir,
          encoding: 'utf8'
        });
        
        // JSON形式で出力を保存
        fs.writeFileSync(snykOutputPath, snykOutput);
        const snykData = JSON.parse(snykOutput);
        
        // 結果の整形
        const vulnerabilities = [];
        let totalVulnerabilities = 0;
        
        if (snykData.vulnerabilities) {
          snykData.vulnerabilities.forEach(vuln => {
            vulnerabilities.push({
              package: vuln.packageName,
              installedVersion: vuln.version,
              vulnerableVersions: vuln.semver,
              severity: vuln.severity,
              description: vuln.title,
              fixAvailable: vuln.isUpgradable || vuln.isPatchable,
              upgradePath: vuln.upgradePath,
              cvssScore: vuln.cvssScore,
              cveName: vuln.identifiers?.CVE?.join(', ')
            });
            totalVulnerabilities++;
          });
        }
        
        // 深刻度別の脆弱性数
        const severityCounts = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
        
        vulnerabilities.forEach(vuln => {
          const severity = vuln.severity.toLowerCase();
          if (severityCounts[severity] !== undefined) {
            severityCounts[severity]++;
          }
        });
        
        const result = {
          scanSuccessful: true,
          vulnerabilitiesFound: totalVulnerabilities,
          vulnerabilities,
          severityCounts,
          reportFile: snykOutputPath
        };
        
        logger.info(`Snykチェックが完了しました。脆弱性: ${totalVulnerabilities}件`);
        return result;
      } catch (execError) {
        // Snykが脆弱性を検出すると非0の終了コードを返すため、出力をキャプチャして処理
        if (execError.stdout) {
          try {
            fs.writeFileSync(snykOutputPath, execError.stdout);
            const snykData = JSON.parse(execError.stdout);
            
            // 結果の整形
            const vulnerabilities = [];
            let totalVulnerabilities = 0;
            
            if (snykData.vulnerabilities) {
              snykData.vulnerabilities.forEach(vuln => {
                vulnerabilities.push({
                  package: vuln.packageName,
                  installedVersion: vuln.version,
                  vulnerableVersions: vuln.semver,
                  severity: vuln.severity,
                  description: vuln.title,
                  fixAvailable: vuln.isUpgradable || vuln.isPatchable,
                  upgradePath: vuln.upgradePath,
                  cvssScore: vuln.cvssScore,
                  cveName: vuln.identifiers?.CVE?.join(', ')
                });
                totalVulnerabilities++;
              });
            }
            
            // 深刻度別の脆弱性数
            const severityCounts = {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0
            };
            
            vulnerabilities.forEach(vuln => {
              const severity = vuln.severity.toLowerCase();
              if (severityCounts[severity] !== undefined) {
                severityCounts[severity]++;
              }
            });
            
            const result = {
              scanSuccessful: true,
              vulnerabilitiesFound: totalVulnerabilities,
              vulnerabilities,
              severityCounts,
              reportFile: snykOutputPath
            };
            
            logger.info(`Snykチェックが完了しました。脆弱性: ${totalVulnerabilities}件`);
            return result;
          } catch (parseError) {
            logger.error(`Snykの出力解析中にエラーが発生しました: ${parseError.message}`);
            return {
              scanSuccessful: false,
              error: parseError.message
            };
          }
        } else {
          logger.error(`Snykコマンド実行中にエラーが発生しました: ${execError.message}`);
          return {
            scanSuccessful: false,
            error: execError.message
          };
        }
      }
    } catch (e) {
      logger.error(`Snykチェック中にエラーが発生しました: ${e.message}`);
      return {
        scanSuccessful: false,
        error: e.message
      };
    }
  }

  /**
   * eslint-plugin-securityを使用してコードの静的解析を実行
   * @returns {Object} コード解析結果
   */
  runEslintSecurity() {
    logger.info('ESLintセキュリティプラグインによる静的解析を開始します');

    try {
      // srcディレクトリが存在するか確認
      const srcDir = path.join(this.projectDir, 'src');
      if (!fs.existsSync(srcDir)) {
        logger.error(`srcディレクトリが見つかりません: ${srcDir}`);
        return { error: 'src directory not found' };
      }

      // eslint-plugin-securityがインストールされているか確認して、なければグローバルに実行
      const eslintConfigPath = path.join(this.outputDir, '.eslintrc-security.json');
      const eslintConfig = {
        "plugins": ["security"],
        "extends": ["plugin:security/recommended"]
      };

      fs.writeFileSync(eslintConfigPath, JSON.stringify(eslintConfig, null, 2));

      // ESLintを実行してJSON形式で結果を取得
      const eslintOutputPath = path.join(this.outputDir, 'eslint_security_report.json');

      try {
        const eslintCmd = `npx eslint --no-eslintrc -c ${eslintConfigPath} --plugin security --ext .js,.jsx,.ts,.tsx --format json "${srcDir}"`;
        const eslintOutput = execSync(eslintCmd, {
          cwd: this.projectDir,
          encoding: 'utf8'
        });

        // JSON形式で出力を保存
        fs.writeFileSync(eslintOutputPath, eslintOutput);
        const eslintData = JSON.parse(eslintOutput);

        // 結果の整形
        const issues = [];
        let totalIssues = 0;

        eslintData.forEach(fileResult => {
          if (fileResult.messages && fileResult.messages.length > 0) {
            fileResult.messages.forEach(msg => {
              // セキュリティ関連のルールのみをフィルタリング
              if (msg.ruleId && msg.ruleId.startsWith('security/')) {
                issues.push({
                  file: fileResult.filePath,
                  line: msg.line,
                  column: msg.column,
                  ruleId: msg.ruleId,
                  message: msg.message,
                  severity: msg.severity === 2 ? 'error' : 'warning'
                });
                totalIssues++;
              }
            });
          }
        });

        // 深刻度別の問題数
        const severityCounts = {
          error: 0,
          warning: 0
        };

        issues.forEach(issue => {
          severityCounts[issue.severity]++;
        });

        const result = {
          scanSuccessful: true,
          issuesFound: totalIssues,
          issues,
          severityCounts,
          reportFile: eslintOutputPath
        };

        logger.info(`ESLintセキュリティチェックが完了しました。問題: ${totalIssues}件`);
        return result;
      } catch (execError) {
        // ESLintがエラーを検出すると非0の終了コードを返すため、出力をキャプチャして処理
        if (execError.stdout) {
          try {
            fs.writeFileSync(eslintOutputPath, execError.stdout);
            const eslintData = JSON.parse(execError.stdout);

            // 結果の整形
            const issues = [];
            let totalIssues = 0;

            eslintData.forEach(fileResult => {
              if (fileResult.messages && fileResult.messages.length > 0) {
                fileResult.messages.forEach(msg => {
                  // セキュリティ関連のルールのみをフィルタリング
                  if (msg.ruleId && msg.ruleId.startsWith('security/')) {
                    issues.push({
                      file: fileResult.filePath,
                      line: msg.line,
                      column: msg.column,
                      ruleId: msg.ruleId,
                      message: msg.message,
                      severity: msg.severity === 2 ? 'error' : 'warning'
                    });
                    totalIssues++;
                  }
                });
              }
            });

            // 深刻度別の問題数
            const severityCounts = {
              error: 0,
              warning: 0
            };

            issues.forEach(issue => {
              severityCounts[issue.severity]++;
            });

            const result = {
              scanSuccessful: true,
              issuesFound: totalIssues,
              issues,
              severityCounts,
              reportFile: eslintOutputPath
            };

            logger.info(`ESLintセキュリティチェックが完了しました。問題: ${totalIssues}件`);
            return result;
          } catch (parseError) {
            logger.error(`ESLint出力の解析中にエラーが発生しました: ${parseError.message}`);
            return {
              scanSuccessful: false,
              error: parseError.message
            };
          }
        } else {
          logger.error(`ESLintコマンド実行中にエラーが発生しました: ${execError.message}`);
          return {
            scanSuccessful: false,
            error: execError.message
          };
        }
      }
    } catch (e) {
      logger.error(`ESLintセキュリティチェック中にエラーが発生しました: ${e.message}`);
      return {
        scanSuccessful: false,
        error: e.message
      };
    }
  }

  /**
   * 検出された問題をOWASP Top 10カテゴリに分類
   * @returns {Object} OWASP Top 10カテゴリ別の問題数
   */
  categorizeByOwasp() {
    // OWASP Top 10 (2021) カテゴリ
    const owaspCategories = {
      'A01:2021-Broken Access Control': [],
      'A02:2021-Cryptographic Failures': [],
      'A03:2021-Injection': [],
      'A04:2021-Insecure Design': [],
      'A05:2021-Security Misconfiguration': [],
      'A06:2021-Vulnerable Components': [],
      'A07:2021-Auth Failures': [],
      'A08:2021-Software Data Integrity Failures': [],
      'A09:2021-Logging Failures': [],
      'A10:2021-SSRF': []
    };

    // ESLintルールをOWASP Top 10にマッピング
    const eslintToOwasp = {
      'security/detect-buffer-noassert': 'A03:2021-Injection',
      'security/detect-child-process': 'A03:2021-Injection',
      'security/detect-disable-mustache-escape': 'A03:2021-Injection',
      'security/detect-eval-with-expression': 'A03:2021-Injection',
      'security/detect-no-csrf-before-method-override': 'A01:2021-Broken Access Control',
      'security/detect-non-literal-fs-filename': 'A03:2021-Injection',
      'security/detect-non-literal-regexp': 'A03:2021-Injection',
      'security/detect-non-literal-require': 'A03:2021-Injection',
      'security/detect-object-injection': 'A03:2021-Injection',
      'security/detect-possible-timing-attacks': 'A02:2021-Cryptographic Failures',
      'security/detect-pseudoRandomBytes': 'A02:2021-Cryptographic Failures',
      'security/detect-unsafe-regex': 'A03:2021-Injection',
      'security/detect-new-buffer': 'A03:2021-Injection',
      'security/detect-bidi-characters': 'A03:2021-Injection'
    };

    // npm auditの脆弱性はすべてA06に分類
    if (this.results.npmAudit && this.results.npmAudit.scanSuccessful) {
      const vulnerabilities = this.results.npmAudit.vulnerabilities || [];
      vulnerabilities.forEach(vuln => {
        owaspCategories['A06:2021-Vulnerable Components'].push({
          source: 'npm_audit',
          package: vuln.package,
          version: vuln.installedVersion,
          description: vuln.description,
          severity: vuln.severity
        });
      });
    }

    // Snykの脆弱性もすべてA06に分類
    if (this.results.snyk && this.results.snyk.scanSuccessful) {
      const vulnerabilities = this.results.snyk.vulnerabilities || [];
      vulnerabilities.forEach(vuln => {
        owaspCategories['A06:2021-Vulnerable Components'].push({
          source: 'snyk',
          package: vuln.package,
          version: vuln.installedVersion,
          description: vuln.description,
          severity: vuln.severity
        });
      });
    }

    // ESLintの問題をOWASP Top 10に分類
    if (this.results.eslint && this.results.eslint.scanSuccessful) {
      const issues = this.results.eslint.issues || [];
      issues.forEach(issue => {
        const owaspCategory = eslintToOwasp[issue.ruleId] || 'A04:2021-Insecure Design';  // デフォルトはA04
        
        owaspCategories[owaspCategory].push({
          source: 'eslint',
          ruleId: issue.ruleId,
          file: issue.file,
          line: issue.line,
          description: issue.message,
          severity: issue.severity
        });
      });
    }

    // カテゴリごとの問題数を集計
    const categoryCounts = {};
    for (const [category, issues] of Object.entries(owaspCategories)) {
      categoryCounts[category] = issues.length;
    }

    return {
      categoryCounts,
      issuesByCategory: owaspCategories
    };
  }

  /**
   * 全セキュリティチェックを実行
   * @returns {Object} チェック結果の辞書
   */
  runChecks() {
    logger.info(`セキュリティチェック開始: ${this.projectDir}`);

    try {
      // npm audit による依存パッケージチェック
      this.results.npmAudit = this.checkNpmAudit();
      
      // Snyk によるチェック (オプション)
      this.results.snyk = this.checkSnyk();
      
      // ESLint-security によるコード静的解析
      this.results.eslint = this.runEslintSecurity();
      
      // OWASP Top 10カテゴリ別のチェック結果を整理
      this.results.owaspCoverage = this.categorizeByOwasp();
      
      logger.info("全セキュリティチェックが完了しました");
    } catch (e) {
      logger.error(`セキュリティチェック実行エラー: ${e.message}`);
      this.results.error = e.message;
    }
    
    return this.results;
  }

  /**
   * テスト結果をJSONファイルに保存
   * @param {string} outputFile - 出力ファイルパス
   * @returns {boolean} 保存成功フラグ
   */
  saveReport(outputFile = null) {
    if (!outputFile) {
      outputFile = path.join(this.outputDir, 'security_report.json');
    }
    
    try {
      fs.writeFileSync(outputFile, JSON.stringify(this.results, null, 2));
      logger.info(`セキュリティレポートを保存しました: ${outputFile}`);
      return true;
    } catch (e) {
      logger.error(`レポート保存エラー: ${e.message}`);
      return false;
    }
  }
}

/**
 * メイン関数
 */
function main() {
  program
    .description('フロントエンドの依存パッケージとコードの脆弱性をチェックします')
    .option('--project-dir <path>', 'プロジェクトディレクトリのパス', '.')
    .option('--output <path>', '出力ファイルのパス')
    .parse(process.argv);

  const options = program.opts();
  
  const checker = new SecurityChecker(options.projectDir);
  const results = checker.runChecks();
  
  // レポート保存
  checker.saveReport(options.output);
  
  // 結果サマリーを表示
  const npmVulnerabilityCount = results.npmAudit?.vulnerabilitiesFound || 0;
  const snykVulnerabilityCount = results.snyk?.vulnerabilitiesFound || 0;
  const eslintIssuesCount = results.eslint?.issuesFound || 0;
  
  console.log("\n=== セキュリティチェック結果サマリー ===");
  console.log(`npm audit による脆弱性: ${npmVulnerabilityCount}件`);
  
  if (results.snyk && !results.snyk.error) {
    console.log(`Snyk による脆弱性: ${snykVulnerabilityCount}件`);
  }
  
  console.log(`ESLint セキュリティの問題: ${eslintIssuesCount}件`);
  console.log(`合計問題数: ${npmVulnerabilityCount + snykVulnerabilityCount + eslintIssuesCount}件`);
  
  // OWASP Top 10カテゴリ別の問題数
  if (results.owaspCoverage && results.owaspCoverage.categoryCounts) {
    console.log("\nOWASP Top 10 (2021) カテゴリ別の問題数:");
    for (const [category, count] of Object.entries(results.owaspCoverage.categoryCounts)) {
      if (count > 0) {
        console.log(`- ${category}: ${count}件`);
      }
    }
  }
  
  const outputPath = options.output || path.join(checker.outputDir, 'security_report.json');
  console.log(`\n詳細レポート: ${path.resolve(outputPath)}`);
  
  // 重大または高レベルの脆弱性があればエラーコードを返す
  const highNpmVulnerabilities = results.npmAudit?.severityCounts?.high || 0 + 
                                results.npmAudit?.severityCounts?.critical || 0;
  const highSnykVulnerabilities = results.snyk?.severityCounts?.high || 0 + 
                                 results.snyk?.severityCounts?.critical || 0;
  const highEslintIssues = results.eslint?.severityCounts?.error || 0;
  
  const totalHighIssues = highNpmVulnerabilities + highSnykVulnerabilities + highEslintIssues;
  
  if (totalHighIssues > 0) {
    console.log(`\n警告: 重大な脆弱性が${totalHighIssues}件見つかりました！`);
    process.exit(1);
  }
  
  process.exit(0);
}

// スクリプトが直接実行された場合にメイン関数を実行
if (require.main === module) {
  main();
}

module.exports = SecurityChecker; 