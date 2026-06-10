<#
.SYNOPSIS
Deploys SecureAnno application to Ubuntu VPS via SSH

.DESCRIPTION
This script packages and uploads your SecureAnno app to your VPS, then runs the setup script.

.PARAMETER VpsHost
The VPS hostname or IP address

.PARAMETER VpsUser
SSH username for VPS (default: ubuntu)

.PARAMETER VpsPort
SSH port (default: 22)

.PARAMETER AppPath
Remote path where app will be deployed (default: /home/{user}/secureanno)

.EXAMPLE
.\deploy-to-vps.ps1 -VpsHost "192.168.1.100" -VpsUser "ubuntu"
.\deploy-to-vps.ps1 -VpsHost "example.com" -VpsUser "deploy"

#>

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsHost,
    
    [Parameter(Mandatory=$false)]
    [string]$VpsUser = "ubuntu",
    
    [Parameter(Mandatory=$false)]
    [int]$VpsPort = 22,
    
    [Parameter(Mandatory=$false)]
    [string]$AppPath = "/home/$VpsUser/secureanno"
)

$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Colors for output
$InfoColor = "Cyan"
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor $InfoColor }
function Write-Success { Write-Host "[✓] $args" -ForegroundColor $SuccessColor }
function Write-Warn { Write-Host "[!] $args" -ForegroundColor $WarningColor }
function Write-Err { Write-Host "[✗] $args" -ForegroundColor $ErrorColor }

# Check prerequisites
Write-Info "Checking prerequisites..."

# Check SSH
$ssh = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $ssh) {
    Write-Err "SSH not found. Please install OpenSSH or Git Bash."
    Write-Info "Install from: https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse"
    exit 1
}
Write-Success "SSH found"

# Check SCP
$scp = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scp) {
    Write-Err "SCP not found. Please install OpenSSH."
    exit 1
}
Write-Success "SCP found"

# Create deployment archive
Write-Info "Creating deployment package..."
$tempDir = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '_secureanno'
if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    # Copy application files
    $excludeItems = @('.env', '.git', '.gitignore', 'node_modules', 'data', '.vscode', '.DS_Store')
    
    Get-ChildItem -Path "." -Exclude $excludeItems | ForEach-Object {
        if ($_.PSIsContainer) {
            Copy-Item -Path $_.FullName -Destination "$tempDir\$($_.Name)" -Recurse -Force
        } else {
            Copy-Item -Path $_.FullName -Destination "$tempDir\$($_.Name)" -Force
        }
    }
    
    Write-Success "Files packaged"
    
    # Create archive
    $archivePath = "$env:TEMP\secureanno-deploy.zip"
    if (Test-Path $archivePath) { Remove-Item -Path $archivePath -Force }
    
    Compress-Archive -Path "$tempDir\*" -DestinationPath $archivePath -Force
    Write-Success "Archive created: $archivePath"
    
    # Test SSH connection
    Write-Info "Testing SSH connection to $VpsHost..."
    $testCmd = ssh -p $VpsPort $VpsUser@$VpsHost "echo 'SSH connection successful'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "SSH connection successful"
    } else {
        Write-Err "SSH connection failed. Check your credentials."
        Write-Info "Make sure you can connect with: ssh -p $VpsPort $VpsUser@$VpsHost"
        exit 1
    }
    
    # Upload archive
    Write-Info "Uploading deployment package to $VpsHost..."
    scp -P $VpsPort -r $archivePath "$VpsUser@$VpsHost`:~/secureanno-deploy.zip"
    Write-Success "Upload completed"
    
    # Extract and setup on remote server
    Write-Info "Setting up application on VPS..."
    ssh -p $VpsPort $VpsUser@$VpsHost @"
set -e
echo "[1/5] Creating application directory..."
mkdir -p $AppPath
cd $AppPath

echo "[2/5] Extracting files..."
unzip -q -o ~/secureanno-deploy.zip -d .

echo "[3/5] Installing Node.js dependencies..."
npm install --production

echo "[4/5] Creating data directory and .env file..."
mkdir -p data
touch data/leads.jsonl

if [ ! -f .env ]; then
    cat > .env << 'EOF'
# SecureAnno Environment Configuration
# Generate a secure key: openssl rand -hex 32
API_KEY=your-secure-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/secureanno_leads
NODE_ENV=production
PORT=3000
EOF
    echo "Created .env - PLEASE EDIT with your actual values!"
fi

echo "[5/5] Cleaning up..."
rm ~/secureanno-deploy.zip

echo ""
echo "========================================="
echo "✓ Deployment completed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your database credentials:"
echo "   nano $AppPath/.env"
echo ""
echo "2. Setup database (if using PostgreSQL):"
echo "   npm run db:setup"
echo ""
echo "3. Start the application:"
echo "   npm start"
echo ""
echo "4. (Optional) Configure with systemd:"
echo "   sudo nano /etc/systemd/system/secureanno.service"
echo "   # Use the example from: deploy/secureanno.service.example"
echo ""
"@
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "VPS setup completed successfully!"
    } else {
        Write-Err "VPS setup failed"
        exit 1
    }
    
    # Show next steps
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor $SuccessColor
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor $SuccessColor
    Write-Host "=========================================" -ForegroundColor $SuccessColor
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor $InfoColor
    Write-Host "1. SSH into your VPS:"
    Write-Host "   ssh -p $VpsPort $VpsUser@$VpsHost"
    Write-Host ""
    Write-Host "2. Configure environment variables:"
    Write-Host "   nano $AppPath/.env"
    Write-Host "   # Add your DATABASE_URL and API_KEY"
    Write-Host ""
    Write-Host "3. Setup the database (if using PostgreSQL):"
    Write-Host "   cd $AppPath"
    Write-Host "   npm run db:setup"
    Write-Host ""
    Write-Host "4. Start the application:"
    Write-Host "   npm start"
    Write-Host ""
    Write-Host "5. (Optional) Setup systemd service for auto-start:"
    Write-Host "   sudo cp deploy/secureanno.service.example /etc/systemd/system/secureanno.service"
    Write-Host "   sudo systemctl daemon-reload"
    Write-Host "   sudo systemctl enable secureanno"
    Write-Host "   sudo systemctl start secureanno"
    Write-Host ""
    
} catch {
    Write-Err "Deployment failed: $_"
    exit 1
} finally {
    # Cleanup
    if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
}
