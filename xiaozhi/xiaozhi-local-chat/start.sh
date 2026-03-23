#!/bin/bash

# Xiaozhi Local Chat - Start Script
# Khởi động server chat AI local

echo "🚀 Xiaozhi Local Chat - Start Script"
echo "==================================="

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

# Check if Ollama is running
check_ollama() {
    if pgrep -x "ollama" > /dev/null; then
        print_success "Ollama đang chạy"
        return 0
    else
        print_warning "Ollama chưa chạy, đang khởi động..."
        ollama serve &
        sleep 3
        return 0
    fi
}

# Check if model is available
check_model() {
    if ollama list | grep -q "qwen2.5:7b"; then
        print_success "Model qwen2.5:7b đã có sẵn"
        return 0
    else
        print_warning "Model qwen2.5:7b chưa có, đang tải..."
        ollama pull qwen2.5:7b
        return $?
    fi
}

# Start the server
start_server() {
    print_status "Khởi động Xiaozhi Local Chat server..."

    cd main/xiaozhi-server

    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 không được tìm thấy"
        exit 1
    fi

    # Check if virtual environment exists and activate
    if [[ -d "venv" ]]; then
        print_status "Kích hoạt virtual environment..."
        source venv/bin/activate
    fi

    # Start server
    python3 app.py
}

# Main function
main() {
    print_status "Kiểm tra các thành phần cần thiết..."

    # Check Ollama
    if ! check_ollama; then
        print_error "Không thể khởi động Ollama"
        exit 1
    fi

    # Check model
    if ! check_model; then
        print_error "Không thể tải model Ollama"
        exit 1
    fi

    # Start server
    start_server
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Đã dừng server${NC}"; exit 0' INT

# Run main function
main "$@"

