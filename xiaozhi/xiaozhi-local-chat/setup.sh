#!/bin/bash

# Xiaozhi Local Chat - Setup Script
# Cài đặt và khởi động hệ thống chat AI local

echo "🚀 Xiaozhi Local Chat - Setup Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on supported OS
check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
    else
        print_error "Unsupported OS: $OSTYPE"
        exit 1
    fi
    print_status "Detected OS: $OS"
}

# Check if Ollama is installed
check_ollama() {
    if command -v ollama &> /dev/null; then
        print_success "Ollama đã được cài đặt"
        return 0
    else
        print_warning "Ollama chưa được cài đặt"
        return 1
    fi
}

# Install Ollama
install_ollama() {
    print_status "Đang cài đặt Ollama..."

    if [[ "$OS" == "linux" ]] || [[ "$OS" == "macos" ]]; then
        curl -fsSL https://ollama.ai/install.sh | sh
        if [[ $? -eq 0 ]]; then
            print_success "Ollama đã được cài đặt thành công"
        else
            print_error "Không thể cài đặt Ollama tự động"
            print_status "Vui lòng cài đặt Ollama thủ công từ: https://ollama.ai/download"
            exit 1
        fi
    else
        print_error "Vui lòng tải Ollama từ: https://ollama.ai/download"
        exit 1
    fi
}

# Pull Ollama model
setup_ollama_model() {
    print_status "Đang tải model Ollama (qwen2.5:7b)..."

    # Start Ollama service in background if not running
    if ! pgrep -x "ollama" > /dev/null; then
        print_status "Khởi động Ollama service..."
        ollama serve &
        sleep 2
    fi

    # Pull the model
    ollama pull qwen2.5:7b

    if [[ $? -eq 0 ]]; then
        print_success "Model qwen2.5:7b đã được tải thành công"
    else
        print_error "Không thể tải model. Vui lòng thử lại."
        exit 1
    fi
}

# Setup Python environment
setup_python() {
    print_status "Đang cài đặt Python dependencies..."

    cd main/xiaozhi-server

    # Check if virtual environment should be used
    if [[ -z "$VIRTUAL_ENV" ]]; then
        print_warning "Khuyến nghị sử dụng virtual environment"
        read -p "Tạo virtual environment? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            python3 -m venv venv
            source venv/bin/activate
            print_status "Virtual environment đã được kích hoạt"
        fi
    fi

    # Install requirements
    pip install -r requirements.txt

    if [[ $? -eq 0 ]]; then
        print_success "Python dependencies đã được cài đặt"
    else
        print_error "Không thể cài đặt Python dependencies"
        exit 1
    fi

    cd ../..
}

# Create data directory
create_data_dir() {
    print_status "Tạo thư mục data..."
    mkdir -p main/xiaozhi-server/data
    touch main/xiaozhi-server/data/.config.yaml
    print_success "Thư mục data đã được tạo"
}

# Main setup function
main() {
    check_os

    print_status "Bắt đầu cài đặt Xiaozhi Local Chat..."

    # Check and install Ollama
    if ! check_ollama; then
        install_ollama
    fi

    # Setup Ollama model
    setup_ollama_model

    # Setup Python environment
    setup_python

    # Create data directory
    create_data_dir

    print_success "Cài đặt hoàn thành!"
    echo ""
    echo "🎉 Để khởi động server:"
    echo "   cd main/xiaozhi-server"
    echo "   python app.py"
    echo ""
    echo "📖 Đọc README.md để biết thêm chi tiết"
}

# Run main function
main "$@"

