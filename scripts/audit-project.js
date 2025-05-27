// scripts/audit-project.js - Complete project analysis
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectAuditor {
  constructor() {
    this.results = {
      security: [],
      dependencies: [],
      redundancies: [],
      inconsistencies: [],
      recommendations: []
    };
  }

  async auditProject() {
    console.log('🔍 Starting Complete Project Audit...');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('=' .repeat(60));

    try {
      await this.checkProjectStructure();
      await this.auditDependencies();
      await this.checkSecurityVulnerabilities();
      await this.findRedundancies();
      await this.checkConsistency();
      await this.generateReport();
    } catch (error) {
      console.error('💥 Audit failed:', error.message);
    }
  }

  async checkProjectStructure() {
    console.log('\n📁 Analyzing Project Structure...');
    
    const expectedStructure = {
      backend: ['package.json', 'index.js', '__tests__', 'Dockerfile'],
      frontend: ['package.json', 'src', 'public', 'Dockerfile'],
      root: ['.github', 'README.md', 'docker-compose.yml']
    };

    const issues = [];
    
    // Check backend structure
    if (fs.existsSync('./backend')) {
      expectedStructure.backend.forEach(file => {
        if (!fs.existsSync(`./backend/${file}`)) {
          issues.push(`Missing: backend/${file}`);
        }
      });
    } else {
      issues.push('Missing: backend directory');
    }

    // Check frontend structure
    if (fs.existsSync('./frontend')) {
      expectedStructure.frontend.forEach(file => {
        if (!fs.existsSync(`./frontend/${file}`)) {
          issues.push(`Missing: frontend/${file}`);
        }
      });
    } else {
      issues.push('Missing: frontend directory');
    }

    // Check root structure
    expectedStructure.root.forEach(file => {
      if (!fs.existsSync(`./${file}`)) {
        issues.push(`Missing: ${file}`);
      }
    });

    if (issues.length > 0) {
      this.results.inconsistencies.push({
        category: 'Project Structure',
        issues: issues
      });
    }
    
    console.log(issues.length > 0 ? `⚠️  Found ${issues.length} structure issues` : '✅ Project structure looks good');
  }

  async auditDependencies() {
    console.log('\n📦 Auditing Dependencies...');
    
    const projects = ['backend', 'frontend'];
    
    for (const project of projects) {
      if (!fs.existsSync(`./${project}/package.json`)) continue;
      
      console.log(`\n   📋 Checking ${project}...`);
      
      try {
        // Read package.json
        const packageJson = JSON.parse(fs.readFileSync(`./${project}/package.json`, 'utf8'));
        
        // Check for unused dependencies
        const unusedDeps = await this.findUnusedDependencies(project, packageJson);
        if (unusedDeps.length > 0) {
          this.results.redundancies.push({
            project,
            type: 'Unused Dependencies',
            items: unusedDeps
          });
        }

        // Check for outdated dependencies
        const outdatedDeps = await this.findOutdatedDependencies(project);
        if (outdatedDeps.length > 0) {
          this.results.dependencies.push({
            project,
            type: 'Outdated Dependencies',
            items: outdatedDeps
          });
        }

        // Check for duplicate dependencies
        const duplicates = this.findDuplicateDependencies(packageJson);
        if (duplicates.length > 0) {
          this.results.redundancies.push({
            project,
            type: 'Duplicate Dependencies',
            items: duplicates
          });
        }

        console.log(`   ✅ ${project} dependencies analyzed`);
        
      } catch (error) {
        console.log(`   ❌ Failed to analyze ${project}: ${error.message}`);
      }
    }
  }

  async checkSecurityVulnerabilities() {
    console.log('\n🛡️  Checking Security Vulnerabilities...');
    
    const projects = ['backend', 'frontend'];
    
    for (const project of projects) {
      if (!fs.existsSync(`./${project}/package.json`)) continue;
      
      console.log(`\n   🔒 Scanning ${project}...`);
      
      try {
        const auditOutput = execSync(`cd ${project} && npm audit --json`, { 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        const auditData = JSON.parse(auditOutput);
        
        if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
          const vulns = Object.values(auditData.vulnerabilities);
          const criticalCount = vulns.filter(v => v.severity === 'critical').length;
          const highCount = vulns.filter(v => v.severity === 'high').length;
          const moderateCount = vulns.filter(v => v.severity === 'moderate').length;
          const lowCount = vulns.filter(v => v.severity === 'low').length;
          
          this.results.security.push({
            project,
            vulnerabilities: {
              critical: criticalCount,
              high: highCount,
              moderate: moderateCount,
              low: lowCount,
              total: vulns.length
            }
          });
          
          console.log(`   ⚠️  Found vulnerabilities: Critical(${criticalCount}) High(${highCount}) Moderate(${moderateCount}) Low(${lowCount})`);
        } else {
          console.log(`   ✅ No vulnerabilities found in ${project}`);
        }
        
      } catch (error) {
        // npm audit returns non-zero exit codes when vulnerabilities are found
        if (error.stdout) {
          try {
            const auditData = JSON.parse(error.stdout);
            if (auditData.vulnerabilities) {
              const vulns = Object.values(auditData.vulnerabilities);
              const criticalCount = vulns.filter(v => v.severity === 'critical').length;
              const highCount = vulns.filter(v => v.severity === 'high').length;
              
              this.results.security.push({
                project,
                vulnerabilities: {
                  critical: criticalCount,
                  high: highCount,
                  moderate: vulns.filter(v => v.severity === 'moderate').length,
                  low: vulns.filter(v => v.severity === 'low').length,
                  total: vulns.length
                }
              });
              
              console.log(`   ⚠️  Found ${vulns.length} vulnerabilities in ${project}`);
            }
          } catch (parseError) {
            console.log(`   ❌ Could not parse audit results for ${project}`);
          }
        } else {
          console.log(`   ❌ Failed to audit ${project}: ${error.message}`);
        }
      }
    }
  }

  async findUnusedDependencies(project, packageJson) {
    const unused = [];
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Simple heuristic: check if dependency name appears in any js/jsx/ts/tsx files
    if (fs.existsSync(`./${project}`)) {
      const files = this.getAllFiles(`./${project}`, ['.js', '.jsx', '.ts', '.tsx']);
      
      for (const dep of Object.keys(dependencies)) {
        let isUsed = false;
        
        for (const file of files) {
          try {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes(`require('${dep}')`) || 
                content.includes(`from '${dep}'`) ||
                content.includes(`import ${dep}`) ||
                content.includes(`import * as`) && content.includes(dep)) {
              isUsed = true;
              break;
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
        
        if (!isUsed && !this.isSpecialDependency(dep)) {
          unused.push(dep);
        }
      }
    }
    
    return unused;
  }

  async findOutdatedDependencies(project) {
    try {
      const outdatedOutput = execSync(`cd ${project} && npm outdated --json`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const outdatedData = JSON.parse(outdatedOutput);
      return Object.keys(outdatedData);
    } catch (error) {
      // npm outdated returns non-zero exit code when outdated packages exist
      if (error.stdout) {
        try {
          const outdatedData = JSON.parse(error.stdout);
          return Object.keys(outdatedData);
        } catch (parseError) {
          return [];
        }
      }
      return [];
    }
  }

  findDuplicateDependencies(packageJson) {
    const duplicates = [];
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    // Find packages that exist in both dependencies and devDependencies
    for (const pkg of Object.keys(deps)) {
      if (devDeps[pkg]) {
        duplicates.push(`${pkg} (exists in both dependencies and devDependencies)`);
      }
    }
    
    return duplicates;
  }

  async findRedundancies() {
    console.log('\n🔄 Checking for Redundancies...');
    
    // Check for duplicate Docker files
    const dockerFiles = ['./backend/Dockerfile', './frontend/Dockerfile'];
    const dockerContents = [];
    
    for (const file of dockerFiles) {
      if (fs.existsSync(file)) {
        dockerContents.push({
          file,
          content: fs.readFileSync(file, 'utf8')
        });
      }
    }
    
    // Simple check for similar Docker configurations
    if (dockerContents.length > 1) {
      const similarities = this.findSimilarContent(dockerContents);
      if (similarities.length > 0) {
        this.results.redundancies.push({
          category: 'Docker Files',
          type: 'Similar Configurations',
          details: similarities
        });
      }
    }
    
    // Check for duplicate GitHub Actions
    const actionsPath = './.github/workflows';
    if (fs.existsSync(actionsPath)) {
      const actionFiles = fs.readdirSync(actionsPath).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
      if (actionFiles.length > 1) {
        this.results.redundancies.push({
          category: 'GitHub Actions',
          type: 'Multiple Workflow Files',
          items: actionFiles
        });
      }
    }
    
    console.log('✅ Redundancy check completed');
  }

  async checkConsistency() {
    console.log('\n⚖️  Checking Consistency...');
    
    const inconsistencies = [];
    
    // Check Node.js versions across Dockerfiles
    const nodeVersions = this.extractNodeVersions();
    if (nodeVersions.length > 1 && new Set(nodeVersions).size > 1) {
      inconsistencies.push('Different Node.js versions across Docker files');
    }
    
    // Check package.json engines consistency
    const engines = this.checkEngineConsistency();
    if (engines.inconsistent) {
      inconsistencies.push('Inconsistent Node.js engine requirements');
    }
    
    // Check test script consistency
    const testScripts = this.checkTestScriptConsistency();
    if (testScripts.inconsistent) {
      inconsistencies.push('Inconsistent test script configurations');
    }
    
    if (inconsistencies.length > 0) {
      this.results.inconsistencies.push({
        category: 'Version Consistency',
        issues: inconsistencies
      });
    }
    
    console.log(inconsistencies.length > 0 ? `⚠️  Found ${inconsistencies.length} consistency issues` : '✅ No consistency issues found');
  }

  generateReport() {
    console.log('\n📊 Generating Audit Report...');
    console.log('=' .repeat(60));
    
    // Security Summary
    console.log('\n🛡️  SECURITY VULNERABILITIES:');
    if (this.results.security.length === 0) {
      console.log('   ✅ No security vulnerabilities found');
    } else {
      this.results.security.forEach(item => {
        const v = item.vulnerabilities;
        console.log(`   📦 ${item.project}: ${v.total} total (Critical: ${v.critical}, High: ${v.high}, Moderate: ${v.moderate}, Low: ${v.low})`);
      });
    }
    
    // Dependencies Summary
    console.log('\n📦 DEPENDENCY ISSUES:');
    if (this.results.dependencies.length === 0) {
      console.log('   ✅ All dependencies are up to date');
    } else {
      this.results.dependencies.forEach(item => {
        console.log(`   📋 ${item.project} - ${item.type}: ${item.items.length} packages`);
      });
    }
    
    // Redundancies Summary
    console.log('\n🔄 REDUNDANCIES:');
    if (this.results.redundancies.length === 0) {
      console.log('   ✅ No redundancies found');
    } else {
      this.results.redundancies.forEach(item => {
        console.log(`   📂 ${item.project || item.category} - ${item.type}: ${item.items?.length || 'Multiple'} items`);
      });
    }
    
    // Inconsistencies Summary
    console.log('\n⚖️  INCONSISTENCIES:');
    if (this.results.inconsistencies.length === 0) {
      console.log('   ✅ No inconsistencies found');
    } else {
      this.results.inconsistencies.forEach(item => {
        console.log(`   📋 ${item.category}: ${item.issues.length} issues`);
        item.issues.forEach(issue => console.log(`      - ${issue}`));
      });
    }
    
    // Recommendations
    this.generateRecommendations();
    console.log('\n💡 RECOMMENDATIONS:');
    if (this.results.recommendations.length === 0) {
      console.log('   🎉 Your project looks great! No major issues found.');
    } else {
      this.results.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📋 Audit completed at:', new Date().toISOString());
    
    // Save detailed report to file
    this.saveReportToFile();
  }

  generateRecommendations() {
    // Security recommendations
    this.results.security.forEach(item => {
      const v = item.vulnerabilities;
      if (v.critical > 0) {
        this.results.recommendations.push(`🚨 URGENT: Fix ${v.critical} critical vulnerabilities in ${item.project} by running 'npm audit fix --force'`);
      }
      if (v.high > 0) {
        this.results.recommendations.push(`⚠️  Fix ${v.high} high-severity vulnerabilities in ${item.project}`);
      }
    });

    // Dependency recommendations
    this.results.dependencies.forEach(item => {
      if (item.items.length > 5) {
        this.results.recommendations.push(`📦 Update ${item.items.length} outdated packages in ${item.project}`);
      }
    });

    // Redundancy recommendations
    this.results.redundancies.forEach(item => {
      if (item.type === 'Unused Dependencies') {
        this.results.recommendations.push(`🧹 Remove ${item.items.length} unused dependencies from ${item.project}`);
      }
    });

    // General recommendations
    if (this.results.security.length === 0 && this.results.dependencies.length === 0) {
      this.results.recommendations.push('🎯 Set up automated security monitoring with GitHub Dependabot');
      this.results.recommendations.push('📊 Consider adding more comprehensive testing coverage');
      this.results.recommendations.push('🚀 Your project is well-maintained - consider documenting your security practices');
    }
  }

  saveReportToFile() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        security: this.results.security.length,
        dependencies: this.results.dependencies.length,
        redundancies: this.results.redundancies.length,
        inconsistencies: this.results.inconsistencies.length
      },
      details: this.results
    };

    const reportPath = './audit-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  // Helper methods
  getAllFiles(dir, extensions, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.getAllFiles(filePath, extensions, fileList);
      } else if (extensions.some(ext => file.endsWith(ext))) {
        fileList.push(filePath);
      }
    });
    return fileList;
  }

  isSpecialDependency(dep) {
    const special = ['nodemon', 'jest', 'eslint', 'prettier', 'webpack', 'babel', 'typescript'];
    return special.some(s => dep.includes(s));
  }

  findSimilarContent(contents) {
    // Simple similarity check - could be more sophisticated
    const similarities = [];
    for (let i = 0; i < contents.length - 1; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        const content1 = contents[i].content;
        const content2 = contents[j].content;
        const similarity = this.calculateSimilarity(content1, content2);
        if (similarity > 0.7) {
          similarities.push(`${contents[i].file} and ${contents[j].file} are ${Math.round(similarity * 100)}% similar`);
        }
      }
    }
    return similarities;
  }

  calculateSimilarity(str1, str2) {
    const lines1 = str1.split('\n');
    const lines2 = str2.split('\n');
    const commonLines = lines1.filter(line => lines2.includes(line)).length;
    return commonLines / Math.max(lines1.length, lines2.length);
  }

  extractNodeVersions() {
    const versions = [];
    const dockerFiles = ['./backend/Dockerfile', './frontend/Dockerfile'];
    
    dockerFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const nodeMatch = content.match(/FROM node:(\d+)/);
        if (nodeMatch) {
          versions.push(nodeMatch[1]);
        }
      }
    });
    
    return versions;
  }

  checkEngineConsistency() {
    const engines = [];
    const packageFiles = ['./backend/package.json', './frontend/package.json'];
    
    packageFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (pkg.engines && pkg.engines.node) {
            engines.push(pkg.engines.node);
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    });
    
    return {
      inconsistent: engines.length > 1 && new Set(engines).size > 1,
      versions: engines
    };
  }

  checkTestScriptConsistency() {
    const testScripts = [];
    const packageFiles = ['./backend/package.json', './frontend/package.json'];
    
    packageFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (pkg.scripts && pkg.scripts.test) {
            testScripts.push(pkg.scripts.test);
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    });
    
    return {
      inconsistent: testScripts.length > 1 && new Set(testScripts).size > 1,
      scripts: testScripts
    };
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new ProjectAuditor();
  auditor.auditProject().catch(console.error);
}

module.exports = ProjectAuditor;