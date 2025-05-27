#!/bin/bash

# scripts/railway-analysis.sh - Railway-specific project analysis

echo "🚂 Railway Project Analysis"
echo "=========================="
echo "Time: $(date)"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed"
else
    echo "✅ Railway CLI found"
fi

# Login check
echo ""
echo "🔐 Checking Railway Authentication..."
if railway auth; then
    echo "✅ Authenticated with Railway"
else
    echo "❌ Not authenticated. Please run: railway login"
    exit 1
fi

echo ""
echo "📊 Railway Project Information:"
echo "==============================="

# Get project info
railway project info || echo "⚠️  Could not get project info"

echo ""
echo "🚀 Railway Services Status:"
echo "==========================="

# List services
railway status || echo "⚠️  Could not get service status"

echo ""
echo "📦 Railway Environment Variables:"
echo "================================"

# Check environment variables (without showing sensitive values)
railway variables list || echo "⚠️  Could not list environment variables"

echo ""
echo "📋 Railway Deployments:"
echo "======================"

# Show recent deployments
railway logs --limit 10 || echo "⚠️  Could not get deployment logs"

echo ""
echo "🔍 Railway Build Analysis:"
echo "========================="

# Check build settings for each service
echo "Analyzing build configurations..."

# Backend analysis
if [ -d "./backend" ]; then
    echo ""
    echo "📱 Backend Service Analysis:"
    echo "   - Dockerfile: $([ -f ./backend/Dockerfile ] && echo "✅ Found" || echo "❌ Missing")"
    echo "   - Package.json: $([ -f ./backend/package.json ] && echo "✅ Found" || echo "❌ Missing")"
    
    if [ -f "./backend/package.json" ]; then
        echo "   - Node.js version: $(node -p "require('./backend/package.json').engines?.node || 'Not specified'")"
        echo "   - Start script: $(node -p "require('./backend/package.json').scripts?.start || 'Not specified'")"
    fi
    
    if [ -f "./backend/Dockerfile" ]; then
        echo "   - Docker FROM: $(grep "FROM" ./backend/Dockerfile | head -1)"
        echo "   - Docker EXPOSE: $(grep "EXPOSE" ./backend/Dockerfile || echo "Not specified")"
    fi
fi

# Frontend analysis
if [ -d "./frontend" ]; then
    echo ""
    echo "🖥️  Frontend Service Analysis:"
    echo "   - Dockerfile: $([ -f ./frontend/Dockerfile ] && echo "✅ Found" || echo "❌ Missing")"
    echo "   - Package.json: $([ -f ./frontend/package.json ] && echo "✅ Found" || echo "❌ Missing")"
    
    if [ -f "./frontend/package.json" ]; then
        echo "   - Node.js version: $(node -p "require('./frontend/package.json').engines?.node || 'Not specified'")"
        echo "   - Build script: $(node -p "require('./frontend/package.json').scripts?.build || 'Not specified'")"
    fi
    
    if [ -f "./frontend/Dockerfile" ]; then
        echo "   - Docker FROM: $(grep "FROM" ./frontend/Dockerfile | head -1)"
        echo "   - Docker EXPOSE: $(grep "EXPOSE" ./frontend/Dockerfile || echo "Not specified")"
    fi
fi

echo ""
echo "⚡ Railway Performance Recommendations:"
echo "====================================="

recommendations=()

# Check for common performance issues
if [ -f "./backend/package.json" ]; then
    deps=$(node -p "Object.keys(require('./backend/package.json').dependencies || {}).length")
    if [ "$deps" -gt 50 ]; then
        recommendations+=("🔧 Backend has $deps dependencies - consider reducing bundle size")
    fi
fi

if [ -f "./frontend/package.json" ]; then
    deps=$(node -p "Object.keys(require('./frontend/package.json').dependencies || {}).length")
    if [ "$deps" -gt 30 ]; then
        recommendations+=("🔧 Frontend has $deps dependencies - consider tree shaking")
    fi
fi

# Check Docker multi-stage builds
if [ -f "./backend/Dockerfile" ] && ! grep -q "AS build" ./backend/Dockerfile; then
    recommendations+=("🐳 Consider multi-stage Docker builds for smaller images")
fi

if [ -f "./frontend/Dockerfile" ] && ! grep -q "AS build" ./frontend/Dockerfile; then
    recommendations+=("🐳 Frontend should use multi-stage build (build -> serve)")
fi

# Check for .dockerignore
if [ ! -f "./.dockerignore" ]; then
    recommendations+=("📁 Add .dockerignore to reduce build context size")
fi

# Check for health endpoints
if [ -f "./backend/index.js" ] && ! grep -q "/health" ./backend/index.js; then
    recommendations+=("🏥 Add health check endpoint for better monitoring")
fi

# Print recommendations
if [ ${#recommendations[@]} -eq 0 ]; then
    echo "🎉 No performance issues found! Your Railway setup looks optimized."
else
    for rec in "${recommendations[@]}"; do
        echo "$rec"
    done
fi

echo ""
echo "🔒 Railway Security Analysis:"
echo "============================"

security_issues=()

# Check for secrets in code
if grep -r "API_KEY\|SECRET\|PASSWORD" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" . 2>/dev/null; then
    security_issues+=("⚠️  Potential secrets found in code - use Railway environment variables")
fi

# Check for production mode
if [ -f "./backend/package.json" ]; then
    if ! node -p "require('./backend/package.json').scripts?.start || ''" | grep -q "NODE_ENV=production"; then
        security_issues+=("🔧 Set NODE_ENV=production in Railway environment variables")
    fi
fi

# Check for CORS configuration
if [ -f "./backend/index.js" ] && grep -q "cors" ./backend/index.js; then
    if grep -q "origin: '\*'" ./backend/index.js; then
        security_issues+=("🌐 CORS allows all origins - restrict in production")
    fi
fi

# Print security issues
if [ ${#security_issues[@]} -eq 0 ]; then
    echo "✅ No obvious security issues found"
else
    for issue in "${security_issues[@]}"; do
        echo "$issue"
    done
fi

echo ""
echo "💰 Railway Cost Optimization:"
echo "============================"

cost_tips=()

# Check for always-on services
cost_tips+=("💡 Use Railway's sleep mode for development environments")
cost_tips+=("📊 Monitor resource usage in Railway dashboard")
cost_tips+=("🔄 Implement graceful shutdowns to reduce cold starts")

# Check for efficient Docker images
if [ -f "./backend/Dockerfile" ]; then
    if grep -q "FROM node:" ./backend/Dockerfile && ! grep -q "alpine" ./backend/Dockerfile; then
        cost_tips+=("🐳 Use Alpine-based Node.js images for smaller size")
    fi
fi

# Check for build caching
if [ -f "./backend/package.json" ] && [ -f "./backend/Dockerfile" ]; then
    if ! grep -q "COPY package" ./backend/Dockerfile; then
        cost_tips+=("📦 Optimize Docker layer caching by copying package.json first")
    fi
fi

echo "Cost optimization tips:"
for tip in "${cost_tips[@]}"; do
    echo "$tip"
done

echo ""
echo "📈 Railway Monitoring Setup:"
echo "=========================="

# Check for logging
if [ -f "./backend/index.js" ]; then
    if grep -q "console.log" ./backend/index.js; then
        echo "✅ Basic logging found"
    else
        echo "⚠️  No logging found - add structured logging"
    fi
fi

# Check for error handling
if [ -f "./backend/index.js" ]; then
    if grep -q "catch\|error" ./backend/index.js; then
        echo "✅ Error handling found"
    else
        echo "⚠️  Limited error handling - add comprehensive error handling"
    fi
fi

echo ""
echo