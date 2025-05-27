// scripts/github-analysis.js - GitHub repository analysis
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GitHubAnalyzer {
  constructor() {
    this.repoInfo = {};
    this.issues = [];
    this.recommendations = [];
  }

  async analyzeRepository() {
    console.log('🐙 GitHub Repository Analysis');
    console.log('============================');
    console.log('Time:', new Date().toISOString());
    console.log('');

    try {
      await this.getRepositoryInfo();
      await this.analyzeSecuritySettings();
      await this.analyzeDependencies();
      await this.analyzeWorkflows();
      await this.analyzeSecrets();
      await this.checkBestPractices();
      await this.generateReport();
    } catch (error) {
      console.error('💥 Analysis failed:', error.message);
    }
  }

  async getRepositoryInfo() {
    console.log('📊 Gathering Repository Information...');
    
    try {
      // Get Git remote info
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      this.repoInfo.remoteUrl = remoteUrl;
      
      // Extract repo name from URL
      const match = remoteUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (match) {
        this.repoInfo.owner = match[1];
        this.repoInfo.name = match[2];
      }
      
      // Get current branch
      this.repoInfo.currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      // Get last commit info
      this.repoInfo.lastCommit = execSync('git log -1 --pretty=format:"%h - %s (%cr)"', { encoding: 'utf8' }).trim();
      
      console.log(`   Repository: ${this.repoInfo.owner}/${this.repoInfo.name}`);
      console.log(`   Current branch: ${this.repoInfo.currentBranch}`);
      console.log(`   Last commit: ${this.repoInfo.lastCommit}`);
      
    } catch (error) {
      console.log('   ⚠️  Could not get full repository info');
      this.issues.push('Unable to retrieve Git repository information');
    }
  }

  async analyzeSecuritySettings() {
    console.log('\n🛡️  Analyzing Security Configuration...');
    
    const securityChecks = [
      { file: '.github/dependabot.yml', name: 'Dependabot configuration' },
      { file: '.github/workflows/codeql-analysis.yml', name: 'CodeQL scanning' },
      { file: '.github/workflows/security.yml', name: 'Security workflow' },
      { file: 'SECURITY.md', name: 'Security policy' }
    ];

    let securityScore = 0;
    
    securityChecks.forEach(check => {
      if (fs.existsSync(check.file)) {
        console.log(`   ✅ ${check.name} found`);
        securityScore++;
      } else {
        console.log(`   ❌ ${check.name} missing`);
        this.issues.push(`Missing ${check.name}: ${check.file}`);
      }
    });

    console.log(`   Security Score: ${securityScore}/${securityChecks.length}`);
    
    if (securityScore < securityChecks.length / 2) {
      this.recommendations.push('🔒 Enable GitHub security features: Dependabot, CodeQL, and Secret Scanning');
    }
  }

  async analyzeDependencies() {
    console.log('\n📦 Analyzing Dependencies...');
    
    const packageFiles = ['backend/package.json', 'frontend/package.json'];
    let totalVulnerabilities = 0;
    
    for (const packageFile of packageFiles) {
      if (fs.existsSync(packageFile)) {
        const projectName = path.dirname(packageFile);
        console.log(`\n   📋 Checking ${projectName}...`);
        
        try {
          // Run npm audit
          const auditCmd = `cd ${projectName} && npm audit --json`;
          const auditOutput = execSync(auditCmd, { encoding: 'utf8' });
          const auditData = JSON.parse(auditOutput);
          
          if (auditData.vulnerabilities) {
            const vulnCount = Object.keys(auditData.vulnerabilities).length;
            totalVulnerabilities += vulnCount;
            
            if (vulnCount > 0) {
              console.log(`   ⚠️  ${vulnCount} vulnerabilities found`);
              this.issues.push(`${projectName}: ${vulnCount} npm vulnerabilities`);
            } else {
              console.log(`   ✅ No vulnerabilities found`);
            }
          }
          
          // Check for outdated packages
          try {
            const outdatedCmd = `cd ${projectName} && npm outdated --json`;
            const outdatedOutput = execSync(outdatedCmd, { encoding: 'utf8' });
            const outdatedData = JSON.parse(outdatedOutput);
            const outdatedCount = Object.keys(outdatedData).length;
            
            if (outdatedCount > 0) {
              console.log(`   📅 ${outdatedCount} outdated packages`);
              this.issues.push(`${projectName}: ${outdatedCount} outdated packages`);
            }
          } catch (error) {
            // npm outdated returns non-zero when packages are outdated
            if (error.stdout) {
              try {
                const outdatedData = JSON.parse(error.stdout);
                const outdatedCount = Object.keys(outdatedData).length;
                console.log(`   📅 ${outdatedCount} outdated packages`);
              } catch (parseError) {
                console.log(`   ❓ Could not check outdated packages`);
              }
            }
          }
          
        } catch (error) {
          if (error.stdout) {
            try {
              const auditData = JSON.parse(error.stdout);
              if (auditData.vulnerabilities) {
                const vulnCount = Object.keys(auditData.vulnerabilities).length;
                totalVulnerabilities += vulnCount;
                console.log(`   ⚠️  ${vulnCount} vulnerabilities found`);
              }
            } catch (parseError) {
              console.log(`   ❌ Could not analyze ${projectName}`);
            }
          }
        }
      }
    }
    
    if (totalVulnerabilities > 0) {
      this.recommendations.push(`🚨 Fix ${totalVulnerabilities} npm vulnerabilities with 'npm audit fix'`);
    }
  }

  async analyzeWorkflows() {
    console.log('\n⚙️  Analyzing GitHub Actions...');
    
    const workflowDir = '.github/workflows';
    
    if (!fs.existsSync(workflowDir)) {
      console.log('   ❌ No GitHub Actions workflows found');
      this.issues.push('No CI/CD workflows configured');
      this.recommendations.push('🔄 Set up GitHub Actions for automated testing and deployment');
      return;
    }
    
    const workflows = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    console.log(`   📋 Found ${workflows.length} workflow(s)`);
    
    let hasTests = false;
    let hasSecurity = false;
    let hasDeploy = false;
    
    workflows.forEach(workflow => {
      const workflowPath = path.join(workflowDir, workflow);
      const content = fs.readFileSync(workflowPath, 'utf8');
      
      console.log(`   📄 ${workflow}:`);
      
      // Check for test jobs
      if (content.includes('npm test') || content.includes('test:')) {
        hasTests = true;
        console.log('      ✅ Testing configured');
      }
      
      // Check for security scanning
      if (content.includes('npm audit') || content.includes('security') || content.includes('codeql')) {
        hasSecurity = true;
        console.log('      ✅ Security scanning configured');
      }
      
      // Check for deployment
      if (content.includes('deploy') || content.includes('railway') || content.includes('docker')) {
        hasDeploy = true;
        console.log('      ✅ Deployment configured');
      }
      
      // Check for secrets usage
      const secretMatches = content.match(/\$\{\{\s*secrets\./g);
      if (secretMatches) {
        console.log(`      🔐 Uses ${secretMatches.length} secret(s)`);
      }
    });
    
    // Recommendations
    if (!hasTests) {
      this.recommendations.push('🧪 Add automated testing to GitHub Actions workflows');
    }
    if (!hasSecurity) {
      this.recommendations.push('🔒 Add security scanning to GitHub Actions workflows');
    }
    if (!hasDeploy) {
      this.recommendations.push('🚀 Add automated deployment to GitHub Actions workflows');
    }
  }

  async analyzeSecrets() {
    console.log('\n🔐 Analyzing Secrets and Sensitive Data...');
    
    const sensitivePatterns = [
      { pattern: /api[_-]?key/i, name: 'API key references' },
      { pattern: /password/i, name: 'Password references' },
      { pattern: /secret/i, name: 'Secret references' },
      { pattern: /token/i, name: 'Token references' },
      { pattern: /\b[A-Za-z0-9]{32,}\b/, name: 'Potential API keys' }
    ];
    
    const filesToCheck = this.getAllFiles('.', ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.yml', '.yaml']);
    let totalFindings = 0;
    
    sensitivePatterns.forEach(({ pattern, name }) => {
      const findings = this.searchFilesForPattern(filesToCheck, pattern);
      if (findings.length > 0) {
        console.log(`   ⚠️  ${name}: ${findings.length} potential issues`);
        totalFindings += findings.length;
        this.issues.push(`Potential ${name.toLowerCase()} found in code`);
      }
    });
    
    if (totalFindings === 0) {
      console.log('   ✅ No obvious secrets found in code');
    } else if (totalFindings > 10) {
      this.recommendations.push('🔒 Review code for hardcoded secrets - use environment variables');
    }
    
    // Check for .env files
    const envFiles = ['.env', '.env.local', '.env.production', 'backend/.env', 'frontend/.env'];
    envFiles.forEach(envFile => {
      if (fs.existsSync(envFile)) {
        console.log(`   📋 Environment file found: ${envFile}`);
        
        // Check if it's in .gitignore
        if (fs.existsSync('.gitignore')) {
          const gitignore = fs.readFileSync('.gitignore', 'utf8');
          if (!gitignore.includes('.env')) {
            this.issues.push(`${envFile} might not be in .gitignore`);
            this.recommendations.push('📁 Ensure .env files are in .gitignore');
          }
        }
      }
    });
  }

  async checkBestPractices() {
    console.log('\n✨ Checking Best Practices...');
    
    const bestPractices = [
      { file: 'README.md', name: 'README documentation', required: true },
      { file: 'LICENSE', name: 'License file', required: false },
      { file: '.gitignore', name: 'Git ignore file', required: true },
      { file: 'CONTRIBUTING.md', name: 'Contributing guidelines', required: false },
      { file: '.editorconfig', name: 'Editor configuration', required: false },
      { file: '.eslintrc.js', name: 'ESLint configuration', required: false },
      { file: '.prettierrc', name: 'Prettier configuration', required: false }
    ];
    
    bestPractices.forEach(practice => {
      if (fs.existsSync(practice.file)) {
        console.log(`   ✅ ${practice.name}`);
      } else {
        const status = practice.required ? '❌' : '⚪';
        console.log(`   ${status} ${practice.name} missing`);
        
        if (practice.required) {
          this.issues.push(`Missing required file: ${practice.file}`);
        }
      }
    });
    
    // Check README quality
    if (fs.existsSync('README.md')) {
      const readme = fs.readFileSync('README.md', 'utf8');
      const sections = ['installation', 'usage', 'deploy', 'api', 'test'];
      const missingSections = sections.filter(section => 
        !readme.toLowerCase().includes(section)
      );
      
      if (missingSections.length > 0) {
        console.log(`   📝 README could include: ${missingSections.join(', ')}`);
        this.recommendations.push('📚 Enhance README with installation, usage, and deployment instructions');
      }
    }
    
    // Check for proper branching strategy
    try {
      const branches = execSync('git branch -r', { encoding: 'utf8' });
      if (!branches.includes('main') && !branches.includes('master')) {
        this.issues.push('No main/master branch found');
      }
      
      if (branches.includes('develop') || branches.includes('dev')) {
        console.log('   ✅ Development branch strategy detected');
      }
    } catch (error) {
      console.log('   ⚠️  Could not check branch strategy');
    }
  }

  generateReport() {
    console.log('\n📊 GitHub Analysis Report');
    console.log('========================');
    
    // Repository Summary
    console.log('\n🏢 Repository Summary:');
    if (this.repoInfo.owner && this.repoInfo.name) {
      console.log(`   📍 Repository: ${this.repoInfo.owner}/${this.repoInfo.name}`);
      console.log(`   🌿 Current Branch: ${this.repoInfo.currentBranch}`);
      console.log(`   📝 Last Commit: ${this.repoInfo.lastCommit}`);
    }
    
    // Issues Summary
    console.log('\n❗ Issues Found:');
    if (this.issues.length === 0) {
      console.log('   🎉 No major issues found!');
    } else {
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (this.recommendations.length === 0) {
      console.log('   ✨ Your repository follows GitHub best practices!');
    } else {
      this.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    // GitHub-specific recommendations
    console.log('\n🐙 GitHub-Specific Recommendations:');
    const githubRecs = [
      '🔒 Enable Dependabot alerts in repository settings',
      '🔍 Set up CodeQL analysis for security scanning',
      '📊 Use GitHub Insights to track repository metrics',
      '🏷️  Create releases and tags for version management',
      '🛡️  Set up branch protection rules for main branch',
      '👥 Configure CODEOWNERS file for code review automation'
    ];
    
    githubRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      repository: this.repoInfo,
      issues: this.issues,
      recommendations: this.recommendations,
      summary: {
        totalIssues: this.issues.length,
        totalRecommendations: this.recommendations.length
      }
    };
    
    fs.writeFileSync('./github-analysis-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Detailed report saved to: github-analysis-report.json');
    
    console.log('\n========================');
    console.log('🎯 Analysis Complete!');
    console.log('========================');
  }

  // Helper methods
  getAllFiles(dir, extensions, fileList = []) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && 
            !file.startsWith('.') && 
            file !== 'node_modules' && 
            file !== 'dist' && 
            file !== 'build') {
          this.getAllFiles(filePath, extensions, fileList);
        } else if (extensions.some(ext => file.endsWith(ext))) {
          fileList.push(filePath);
        }
      });
    } catch (error) {
      // Skip directories we can't read
    }
    return fileList;
  }

  searchFilesForPattern(files, pattern) {
    const findings = [];
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(pattern);
        if (matches) {
          findings.push({ file, matches: matches.length });
        }
      } catch (error) {
        // Skip files we can't read
      }
    });
    return findings;
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new GitHubAnalyzer();
  analyzer.analyzeRepository().catch(console.error);
}

module.exports = GitHubAnalyzer;