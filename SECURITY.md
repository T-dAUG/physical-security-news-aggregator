# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in this project, please follow these steps:

### 1. **Do Not** Create a Public Issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Report Privately

Instead, please report security vulnerabilities via:

- **Email**: [Create a private security advisory](https://github.com/t-dAUG/physical-security-news-aggregator/security/advisories/new)
- **GitHub Security Advisories**: Use GitHub's private vulnerability reporting feature

### 3. Include Details

When reporting a vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Impact**: Description of the potential impact
- **Affected Components**: Which parts of the application are affected
- **Suggested Fix**: If you have suggestions for fixing the issue

### 4. Response Timeline

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

## Security Measures

This project implements several security measures:

### Application Security
- Regular dependency vulnerability scanning with `npm audit`
- Automated security updates via Dependabot
- CORS protection and rate limiting
- Input validation and sanitization
- Secure HTTP headers with Helmet.js

### Infrastructure Security
- Environment variable management for secrets
- Secure deployment pipelines
- Regular security monitoring
- Access control and authentication

### Development Security
- Pre-commit hooks for security scanning
- Automated security testing in CI/CD
- Code review requirements
- Regular security audits

## Security Best Practices

When contributing to this project:

1. **Never commit secrets** like API keys, passwords, or tokens
2. **Use environment variables** for configuration
3. **Keep dependencies updated** regularly
4. **Follow secure coding practices**
5. **Test security features** thoroughly

## Security Tools

We use the following security tools:

- **npm audit**: Dependency vulnerability scanning
- **Dependabot**: Automated dependency updates
- **GitHub Advanced Security**: Code scanning and secret detection
- **Custom security audits**: Regular manual security reviews

## Contact

For security-related questions or concerns:

- **Security Team**: Create a private security advisory on GitHub
- **General Questions**: Open a public discussion in GitHub Discussions

## Acknowledgments

We appreciate the security research community and will acknowledge researchers who report vulnerabilities responsibly.

---

**Last Updated**: May 27, 2025