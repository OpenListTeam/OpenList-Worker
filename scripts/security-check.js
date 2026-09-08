#!/usr/bin/env node

/**
 * 安全配置检查脚本
 * 
 * 用于验证生产环境的安全配置是否完整
 * 
 * 使用方法：
 * node scripts/security-check.js
 * 
 * 或在 package.json 中添加：
 * "scripts": {
 *   "security-check": "node scripts/security-check.js"
 * }
 */

const requiredEnvVars = [
  {
    name: 'JWT_SECRET',
    minLength: 32,
    description: 'JWT 签名密钥',
    generateCommand: 'openssl rand -hex 32'
  },
  {
    name: 'ENCRYPTION_SECRET',
    minLength: 32,
    description: '数据加密密钥',
    generateCommand: 'openssl rand -hex 32'
  }
]

const optionalEnvVars = [
  { name: 'CRON_SECRET', description: '定时任务密钥' },
  { name: 'MAX_UPLOAD_SIZE', description: '最大上传大小（字节）' },
  { name: 'LOGIN_MAX_FAILURES', description: '登录失败锁定阈值' }
]

function checkEnvVar(config) {
  const value = process.env[config.name]
  
  if (!value) {
    return {
      passed: false,
      message: `❌ ${config.name}: 未设置`,
      suggestion: config.generateCommand 
        ? `生成命令: ${config.generateCommand}` 
        : null
    }
  }
  
  if (config.minLength && value.length < config.minLength) {
    return {
      passed: false,
      message: `❌ ${config.name}: 长度不足（当前 ${value.length}，要求 ${config.minLength}+）`,
      suggestion: config.generateCommand 
        ? `生成命令: ${config.generateCommand}` 
        : null
    }
  }
  
  return {
    passed: true,
    message: `✅ ${config.name}: 已正确配置`
  }
}

function main() {
  console.log('🔒 OpenList-TSWorker 安全配置检查\n')
  console.log('=' .repeat(60))
  
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.ENVIRONMENT === 'production'
  
  console.log(`环境: ${isProduction ? '生产环境 🔴' : '开发环境 🟡'}`)
  console.log('=' .repeat(60))
  console.log()
  
  // 检查必需的环境变量
  console.log('📋 必需的环境变量:\n')
  let allPassed = true
  const failures = []
  
  for (const config of requiredEnvVars) {
    const result = checkEnvVar(config)
    console.log(`  ${result.message}`)
    if (result.suggestion) {
      console.log(`     💡 ${result.suggestion}`)
    }
    
    if (!result.passed) {
      allPassed = false
      failures.push(config.name)
    }
  }
  
  // 检查可选的环境变量
  console.log('\n📋 可选的环境变量（推荐配置）:\n')
  for (const config of optionalEnvVars) {
    const value = process.env[config.name]
    if (value) {
      console.log(`  ✅ ${config.name}: ${value}`)
    } else {
      console.log(`  ⚪ ${config.name}: 未设置（使用默认值）`)
    }
  }
  
  // 检查密钥安全性
  console.log('\n📋 密钥安全性检查:\n')
  
  const jwtSecret = process.env.JWT_SECRET
  const encSecret = process.env.ENCRYPTION_SECRET
  
  if (jwtSecret && encSecret && jwtSecret === encSecret) {
    console.log('  ⚠️  JWT_SECRET 和 ENCRYPTION_SECRET 相同（建议使用不同的密钥）')
    allPassed = false
  } else if (jwtSecret && encSecret) {
    console.log('  ✅ JWT_SECRET 和 ENCRYPTION_SECRET 不同')
  }
  
  // 检查弱密钥
  const weakPatterns = [
    'secret', 'password', '123456', 'test', 'example', 
    'changeme', 'default', 'admin', 'demo'
  ]
  
  for (const config of requiredEnvVars) {
    const value = process.env[config.name]
    if (value) {
      const lowerValue = value.toLowerCase()
      const isWeak = weakPatterns.some(pattern => lowerValue.includes(pattern))
      
      if (isWeak) {
        console.log(`  ⚠️  ${config.name} 包含常见弱密钥模式`)
        allPassed = false
      }
    }
  }
  
  // 最终结果
  console.log('\n' + '='.repeat(60))
  if (allPassed && (!isProduction || failures.length === 0)) {
    console.log('✅ 安全配置检查通过！')
    console.log('='.repeat(60))
    process.exit(0)
  } else {
    console.log('❌ 安全配置检查失败')
    console.log('='.repeat(60))
    
    if (failures.length > 0) {
      console.log('\n未配置的必需变量:')
      failures.forEach(name => console.log(`  - ${name}`))
    }
    
    if (isProduction) {
      console.log('\n⚠️  生产环境必须配置所有必需的环境变量！')
      process.exit(1)
    } else {
      console.log('\n⚪ 开发环境警告：建议配置所有环境变量以测试生产环境行为')
      process.exit(0)
    }
  }
}

// 运行检查
try {
  main()
} catch (error) {
  console.error('❌ 检查脚本执行失败:', error.message)
  process.exit(1)
}
