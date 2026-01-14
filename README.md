# Content Factory

AI News to Turkish Content Pipeline - Fetches AI company news and sends to n8n for processing.

## Setup

### 1. n8n Webhook

1. Create n8n workflow with Webhook node
2. Copy the webhook URL

### 2. GitHub Repository

1. Create a new private repository
2. Push all files to the repository
3. Go to Settings > Secrets and variables > Actions
4. Add secret: `N8N_WEBHOOK_URL` with your webhook URL

### 3. Enable Workflow

1. Go to Actions tab
2. Enable workflows if prompted
3. The workflow runs hourly automatically

## Manual Run

**Local:**
```bash
export N8N_WEBHOOK_URL="your-webhook-url"
pip install -r requirements.txt
python content_factory.py
```

**GitHub Actions:**
1. Go to Actions tab
2. Select "Content Factory" workflow
3. Click "Run workflow"

## RSS Sources

- Anthropic News
- Anthropic Engineering
- Anthropic Research
- OpenAI Research
- xAI News
