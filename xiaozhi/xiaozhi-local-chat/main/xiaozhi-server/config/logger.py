import os
import sys
from loguru import logger
from config.config_loader import load_config
from config.settings import check_config_file
from datetime import datetime

SERVER_VERSION = "0.8.9"
_logger_initialized = False


def get_module_abbreviation(module_name, module_dict):
    """Lấy tên viết tắt của module, trả về 00 nếu rỗng
    Nếu tên chứa dấu gạch dưới, trả về 2 ký tự đầu sau dấu gạch dưới
    """
    module_value = module_dict.get(module_name, "")
    if not module_value:
        return "00"
    if "_" in module_value:
        parts = module_value.split("_")
        return parts[-1][:2] if parts[-1] else "00"
    return module_value[:2]


def build_module_string(selected_module):
    """Xây dựng chuỗi module"""
    return (
        get_module_abbreviation("VAD", selected_module)
        + get_module_abbreviation("ASR", selected_module)
        + get_module_abbreviation("LLM", selected_module)
        + get_module_abbreviation("TTS", selected_module)
        + get_module_abbreviation("Memory", selected_module)
        + get_module_abbreviation("Intent", selected_module)
        + get_module_abbreviation("VLLM", selected_module)
    )


def formatter(record):
    """Thêm giá trị mặc định cho log không có tag, và xử lý chuỗi module động"""
    record["extra"].setdefault("tag", record["name"])
    # Nếu chưa thiết lập selected_module, sử dụng mặc định
    record["extra"].setdefault("selected_module", "00000000000000")
    # Đưa selected_module từ extra ra ngoài để hỗ trợ định dạng {selected_module}
    record["selected_module"] = record["extra"]["selected_module"]
    return record["message"]


def setup_logging():
    check_config_file()
    """Đọc cấu hình log từ file config, thiết lập định dạng và cấp độ log"""
    config = load_config()
    log_config = config.get("server", {}).get("log", {})
    global _logger_initialized

    # Cấu hình log lần đầu khởi tạo
    if not _logger_initialized:
        # Khởi tạo với chuỗi module mặc định
        logger.configure(
            extra={
                "selected_module": log_config.get("selected_module", "00000000000000"),
            }
        )

        log_format = log_config.get(
            "log_format",
            "<green>{time:YYMMDD HH:mm:ss}</green>[{version}_{extra[selected_module]}][<light-blue>{extra[tag]}</light-blue>]-<level>{level}</level>-<light-green>{message}</light-green>",
        )
        log_format_file = log_config.get(
            "log_format_file",
            "{time:YYYY-MM-DD HH:mm:ss} - {version}_{extra[selected_module]} - {name} - {level} - {extra[tag]} - {message}",
        )
        log_format = log_format.replace("{version}", SERVER_VERSION)
        log_format_file = log_format_file.replace("{version}", SERVER_VERSION)

        log_level = log_config.get("log_level", "INFO")
        log_dir = log_config.get("log_dir", "tmp")
        log_file = log_config.get("log_file", "server.log")
        data_dir = log_config.get("data_dir", "data")

        os.makedirs(log_dir, exist_ok=True)
        os.makedirs(data_dir, exist_ok=True)

        # Cấu hình đầu ra log
        logger.remove()

        # Xuất ra console
        logger.add(sys.stdout, format=log_format, level=log_level, filter=formatter)

        # Xuất ra file - Thư mục thống nhất, xoay vòng theo dung lượng
        # Đường dẫn đầy đủ file log
        log_file_path = os.path.join(log_dir, log_file)

        # Thêm trình xử lý log
        logger.add(
            log_file_path,
            format=log_format_file,
            level=log_level,
            filter=formatter,
            rotation="10 MB",  # Tối đa 10MB mỗi file
            retention="30 days",  # Giữ lại 30 ngày
            compression=None,
            encoding="utf-8",
            enqueue=True,  # An toàn bất đồng bộ
            backtrace=True,
            diagnose=True,
        )
        _logger_initialized = True  # Đánh dấu đã khởi tạo

    return logger


def create_connection_logger(selected_module_str):
    """为连接创建独立的日志器，绑定特定的模块字符串"""
    return logger.bind(selected_module=selected_module_str)
