// scripts/setup-env.js
// Script สำหรับตั้งค่า environment variables

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class EnvSetup {
  constructor() {
    this.envConfig = new Map();
    this.environments = ['development', 'production', 'test'];
  }

  async promptUser(question, defaultValue = '') {
    return new Promise((resolve) => {
      const prompt = defaultValue 
        ? `${question} (default: ${defaultValue}): `
        : `${question}: `;
      
      rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async setupDatabase() {
    console.log('\n🗄️  Database Configuration');
    console.log('=====================================');
    
    const dbHost = await this.promptUser('PostgreSQL Host', 'localhost');
    const dbPort = await this.promptUser('PostgreSQL Port', '5433');
    const dbName = await this.promptUser('Database Name', 'n8n');
    const dbUser = await this.promptUser('Database User', 'admin');
    const dbPass = await this.promptUser('Database Password', 'P@ssw0rd');

    this.envConfig.set('DB_POSTGRESDB_HOST', dbHost);
    this.envConfig.set('DB_POSTGRESDB_PORT', dbPort);
    this.envConfig.set('DB_POSTGRESDB_DATABASE', dbName);
    this.envConfig.set('DB_POSTGRESDB_USER', dbUser);
    this.envConfig.set('DB_POSTGRESDB_PASSWORD', dbPass);
  }

  async setupAI() {
    console.log('\n🤖 AI Configuration');
    console.log('=====================================');
    
    console.log('Available AI Providers:');
    console.log('1. local (Ollama)');
    console.log('2. openai (OpenAI GPT)');
    console.log('3. claude (Anthropic Claude)');
    console.log('4. gemini (Google Gemini)');
    console.log('5. mock (For testing)');
    
    const provider = await this.promptUser('Choose AI Provider (1-5)', '1');
    const providerMap = {
      '1': 'local',
      '2': 'openai', 
      '3': 'claude',
      '4': 'gemini',
      '5': 'mock'
    };

    const selectedProvider = providerMap[provider] || 'local';
    this.envConfig.set('VITE_AI_PROVIDER', selectedProvider);

    if (selectedProvider === 'local') {
      const ollamaUrl = await this.promptUser('Ollama URL', 'http://localhost:7869');
      const ollamaModel = await this.promptUser('Ollama Model', 'qwen3:0.6b');
      
      this.envConfig.set('VITE_OLLAMA_URL', ollamaUrl);
      this.envConfig.set('VITE_OLLAMA_MODEL', ollamaModel);
      this.envConfig.set('OLLAMA_BASE_URL', ollamaUrl);
      this.envConfig.set('OLLAMA_MODEL', ollamaModel);
    } else if (selectedProvider === 'openai') {
      const apiKey = await this.promptUser('OpenAI API Key');
      const model = await this.promptUser('OpenAI Model', 'gpt-3.5-turbo');
      
      this.envConfig.set('VITE_OPENAI_API_KEY', apiKey);
      this.envConfig.set('VITE_OPENAI_MODEL', model);
      this.envConfig.set('OPENAI_API_KEY', apiKey);
      this.envConfig.set('OPENAI_MODEL', model);
    } else if (selectedProvider === 'claude') {
      const apiKey = await this.promptUser('Claude API Key');
      const model = await this.promptUser('Claude Model', 'claude-3-sonnet-20240229');
      
      this.envConfig.set('VITE_CLAUDE_API_KEY', apiKey);
      this.envConfig.set('VITE_CLAUDE_MODEL', model);
      this.envConfig.set('CLAUDE_API_KEY', apiKey);
      this.envConfig.set('CLAUDE_MODEL', model);
    } else if (selectedProvider === 'gemini') {
      const apiKey = await this.promptUser('Gemini API Key');
      const model = await this.promptUser('Gemini Model', 'gemini-pro');
      
      this.envConfig.set('VITE_GEMINI_API_KEY', apiKey);
      this.envConfig.set('VITE_GEMINI_MODEL', model);
      this.envConfig.set('GEMINI_API_KEY', apiKey);
      this.envConfig.set('GEMINI_MODEL', model);
    }
  }

  async setupServer() {
    console.log('\n⚙️  Server Configuration');
    console.log('=====================================');
    
    const port = await this.promptUser('Server Port', '3001');
    const corsOrigin = await this.promptUser('CORS Origin', 'http://localhost:5173');
    
    this.envConfig.set('PORT', port);
    this.envConfig.set('CORS_ORIGIN', corsOrigin);
    this.envConfig.set('VITE_API_BASE_URL', `http://localhost:${port}/api`);
  }

  async setupSecurity() {
    console.log('\n🔒 Security Configuration');
    console.log('=====================================');
    
    const deniedThreshold = await this.promptUser('Security Denied Rate Threshold (%)', '10');
    const unusualTimeThreshold = await this.promptUser('Unusual Access Time Threshold (hour)', '22');
    const maxFailedAttempts = await this.promptUser('Max Failed Attempts', '5');
    
    this.envConfig.set('SECURITY_DENIED_RATE_THRESHOLD', deniedThreshold);
    this.envConfig.set('SECURITY_UNUSUAL_TIME_THRESHOLD', unusualTimeThreshold);
    this.envConfig.set('SECURITY_MAX_FAILED_ATTEMPTS', maxFailedAttempts);
  }

  async setupFeatures() {
    console.log('\n🎛️  Feature Configuration');
    console.log('=====================================');
    
    const enableDemo = await this.promptUser('Enable Demo Mode? (y/n)', 'n');
    const enableSampleData = await this.promptUser('Enable Sample Data? (y/n)', 'y');
    const enableEmailAlerts = await this.promptUser('Enable Email Alerts? (y/n)', 'n');
    
    this.envConfig.set('VITE_ENABLE_DEMO_MODE', enableDemo === 'y' ? 'true' : 'false');
    this.envConfig.set('VITE_ENABLE_SAMPLE_DATA', enableSampleData === 'y' ? 'true' : 'false');
    this.envConfig.set('ENABLE_EMAIL_ALERTS', enableEmailAlerts === 'y' ? 'true' : 'false');

    if (enableEmailAlerts === 'y') {
      const smtpHost = await this.promptUser('SMTP Host', 'smtp.gmail.com');
      const smtpUser = await this.promptUser('SMTP User (Email)');
      const smtpPass = await this.promptUser('SMTP Password');
      
      this.envConfig.set('SMTP_HOST', smtpHost);
      this.envConfig.set('SMTP_USER', smtpUser);
      this.envConfig.set('SMTP_PASS', smtpPass);
    }
  }

  generateEnvFile(environment = 'development') {
    const envTemplate = `# ===============================================
# ACCESS LOG ANALYZER - ${environment.toUpperCase()} CONFIGURATION
# ===============================================
# Generated on: ${new Date().toISOString()}

# ===============================================
# SERVER CONFIGURATION
# ===============================================
NODE_ENV=${environment}
PORT=${this.envConfig.get('PORT') || '3001'}
API_PREFIX=/api
CORS_ORIGIN=${this.envConfig.get('CORS_ORIGIN') || 'http://localhost:5173'}

# ===============================================
# DATABASE CONFIGURATION
# ===============================================
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=${this.envConfig.get('DB_POSTGRESDB_HOST') || 'localhost'}
DB_POSTGRESDB_PORT=${this.envConfig.get('DB_POSTGRESDB_PORT') || '5433'}
DB_POSTGRESDB_DATABASE=${this.envConfig.get('DB_POSTGRESDB_DATABASE') || 'n8n'}
DB_POSTGRESDB_USER=${this.envConfig.get('DB_POSTGRESDB_USER') || 'admin'}
DB_POSTGRESDB_PASSWORD=${this.envConfig.get('DB_POSTGRESDB_PASSWORD') || 'P@ssw0rd'}

# ===============================================
# AI CONFIGURATION
# ===============================================
VITE_AI_PROVIDER=${this.envConfig.get('VITE_AI_PROVIDER') || 'local'}

# Local AI (Ollama)
VITE_OLLAMA_URL=${this.envConfig.get('VITE_OLLAMA_URL') || 'http://localhost:7869'}
VITE_OLLAMA_MODEL=${this.envConfig.get('VITE_OLLAMA_MODEL') || 'qwen3:0.6b'}
OLLAMA_BASE_URL=${this.envConfig.get('OLLAMA_BASE_URL') || 'http://localhost:7869'}
OLLAMA_MODEL=${this.envConfig.get('OLLAMA_MODEL') || 'qwen3:0.6b'}

# OpenAI
VITE_OPENAI_API_KEY=${this.envConfig.get('VITE_OPENAI_API_KEY') || ''}
VITE_OPENAI_MODEL=${this.envConfig.get('VITE_OPENAI_MODEL') || 'gpt-3.5-turbo'}

# Claude
VITE_CLAUDE_API_KEY=${this.envConfig.get('VITE_CLAUDE_API_KEY') || ''}
VITE_CLAUDE_MODEL=${this.envConfig.get('VITE_CLAUDE_MODEL') || 'claude-3-sonnet-20240229'}

# Gemini
VITE_GEMINI_API_KEY=${this.envConfig.get('VITE_GEMINI_API_KEY') || ''}
VITE_GEMINI_MODEL=${this.envConfig.get('VITE_GEMINI_MODEL') || 'gemini-pro'}

# ===============================================
# FRONTEND CONFIGURATION
# ===============================================
VITE_API_BASE_URL=${this.envConfig.get('VITE_API_BASE_URL') || 'http://localhost:3001/api'}
VITE_ENABLE_AI_CHAT=true
VITE_ENABLE_LOG_ANALYSIS=true
VITE_ENABLE_DEMO_MODE=${this.envConfig.get('VITE_ENABLE_DEMO_MODE') || 'false'}
VITE_ENABLE_SAMPLE_DATA=${this.envConfig.get('VITE_ENABLE_SAMPLE_DATA') || 'true'}
VITE_DEBUG_AI=false

# ===============================================
# SECURITY CONFIGURATION
# ===============================================
SECURITY_DENIED_RATE_THRESHOLD=${this.envConfig.get('SECURITY_DENIED_RATE_THRESHOLD') || '10'}
SECURITY_UNUSUAL_TIME_THRESHOLD=${this.envConfig.get('SECURITY_UNUSUAL_TIME_THRESHOLD') || '22'}
SECURITY_MAX_FAILED_ATTEMPTS=${this.envConfig.get('SECURITY_MAX_FAILED_ATTEMPTS') || '5'}

# ===============================================
# EMAIL CONFIGURATION
# ===============================================
ENABLE_EMAIL_ALERTS=${this.envConfig.get('ENABLE_EMAIL_ALERTS') || 'false'}
SMTP_HOST=${this.envConfig.get('SMTP_HOST') || 'smtp.gmail.com'}
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${this.envConfig.get('SMTP_USER') || ''}
SMTP_PASS=${this.envConfig.get('SMTP_PASS') || ''}

# ===============================================
# FILE UPLOAD CONFIGURATION
# ===============================================
LOG_UPLOAD_DIR=uploads/logs
MAX_LOG_FILE_SIZE=52428800
ALLOWED_LOG_FILE_TYPES=txt,log,csv
MAX_LOG_FILES_PER_UPLOAD=5

# ===============================================
# LOGGING & MONITORING
# ===============================================
LOG_LEVEL=${environment === 'production' ? 'warn' : 'info'}
ENABLE_PERFORMANCE_MONITORING=true
HEALTH_CHECK_INTERVAL=30000

# ===============================================
# CACHING & PERFORMANCE
# ===============================================
ENABLE_RESPONSE_CACHE=true
CACHE_TTL_STATS=300
CACHE_TTL_LOGS=60
CACHE_TTL_CHARTS=600
`;

    return envTemplate;
  }

  async saveEnvFile(environment = 'development') {
    const envContent = this.generateEnvFile(environment);
    const fileName = environment === 'development' ? '.env' : `.env.${environment}`;
    const filePath = path.join(process.cwd(), fileName);

    try {
      fs.writeFileSync(filePath, envContent, 'utf8');
      console.log(`\n✅ Environment file saved: ${fileName}`);
      return true;
    } catch (error) {
      console.error(`\n❌ Error saving environment file: ${error.message}`);
      return false;
    }
  }

  async validateConfiguration() {
    console.log('\n🔍 Validating Configuration...');
    
    const validations = [
      {
        name: 'Database Connection',
        check: () => this.envConfig.get('DB_POSTGRESDB_HOST') && this.envConfig.get('DB_POSTGRESDB_DATABASE')
      },
      {
        name: 'AI Provider',
        check: () => this.envConfig.get('VITE_AI_PROVIDER')
      },
      {
        name: 'Server Port',
        check: () => this.envConfig.get('PORT') && !isNaN(parseInt(this.envConfig.get('PORT')))
      }
    ];

    let allValid = true;
    for (const validation of validations) {
      const isValid = validation.check();
      console.log(`  ${isValid ? '✅' : '❌'} ${validation.name}`);
      if (!isValid) allValid = false;
    }

    return allValid;
  }

  async run() {
    console.log('🚀 Access Log Analyzer - Environment Setup');
    console.log('===========================================\n');

    try {
      await this.setupDatabase();
      await this.setupAI();
      await this.setupServer();
      await this.setupSecurity();
      await this.setupFeatures();

      console.log('\n📋 Configuration Summary');
      console.log('=====================================');
      for (const [key, value] of this.envConfig) {
        const displayValue = key.includes('PASSWORD') || key.includes('API_KEY') 
          ? '*'.repeat(value.length) 
          : value;
        console.log(`${key}: ${displayValue}`);
      }

      const isValid = await this.validateConfiguration();
      if (!isValid) {
        console.log('\n⚠️  Some validations failed. Please review your configuration.');
        const proceed = await this.promptUser('Do you want to proceed anyway? (y/n)', 'n');
        if (proceed !== 'y') {
          console.log('Setup cancelled.');
          rl.close();
          return;
        }
      }

      console.log('\n💾 Saving Environment Files...');
      for (const env of this.environments) {
        await this.saveEnvFile(env);
      }

      console.log('\n🎉 Setup completed successfully!');
      console.log('\nNext Steps:');
      console.log('1. Review the generated .env files');
      console.log('2. Install dependencies: npm install');
      console.log('3. Setup database: npm run db:migrate');
      console.log('4. Start the application: npm run dev');

    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
    } finally {
      rl.close();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new EnvSetup();
  setup.run();
}

module.exports = EnvSetup;