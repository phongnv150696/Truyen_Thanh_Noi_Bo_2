import os
import yaml
from collections.abc import Mapping
from config.manage_api_client import init_service, get_server_config, get_agent_models


def get_project_dir():
    """Lấy thư mục gốc của dự án"""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/"


def read_config(config_path):
    with open(config_path, "r", encoding="utf-8") as file:
        config = yaml.safe_load(file)
    return config


def load_config():
    """Tải file cấu hình"""
    from core.utils.cache.manager import cache_manager, CacheType

    # Kiểm tra cache
    cached_config = cache_manager.get(CacheType.CONFIG, "main_config")
    if cached_config is not None:
        return cached_config

    default_config_path = get_project_dir() + "config.yaml"
    custom_config_path = get_project_dir() + "data/.config.yaml"

    # Tải cấu hình mặc định
    default_config = read_config(default_config_path)
    custom_config = read_config(custom_config_path)

    if custom_config.get("manager-api", {}).get("url"):
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            # Nếu đang ở trong vòng lặp sự kiện, sử dụng phiên bản bất đồng bộ
            config = asyncio.run_coroutine_threadsafe(
                get_config_from_api_async(custom_config), loop
            ).result()
        except RuntimeError:
            # Nếu không ở trong vòng lặp sự kiện (khi khởi động), tạo vòng lặp mới
            config = asyncio.run(get_config_from_api_async(custom_config))
    else:
        # Hợp nhất cấu hình
        config = merge_configs(default_config, custom_config)
    # Khởi tạo thư mục
    ensure_directories(config)

    # Cache cấu hình
    cache_manager.set(CacheType.CONFIG, "main_config", config)
    return config


async def get_config_from_api_async(config):
    """Lấy cấu hình từ Java API (phiên bản bất đồng bộ)"""
    # Khởi tạo client API
    init_service(config)

    # Lấy cấu hình server
    config_data = await get_server_config()
    if config_data is None:
        raise Exception("Không thể lấy cấu hình server từ API")

    config_data["read_config_from_api"] = True
    config_data["manager-api"] = {
        "url": config["manager-api"].get("url", ""),
        "secret": config["manager-api"].get("secret", ""),
    }
    # Cấu hình server ưu tiên lấy ở local
    if config.get("server"):
        config_data["server"] = {
            "ip": config["server"].get("ip", ""),
            "port": config["server"].get("port", ""),
            "http_port": config["server"].get("http_port", ""),
            "vision_explain": config["server"].get("vision_explain", ""),
            "auth_key": config["server"].get("auth_key", ""),
        }
    # Nếu server không có prompt_template, đọc từ cấu hình local
    if not config_data.get("prompt_template"):
        config_data["prompt_template"] = config.get("prompt_template")
    return config_data


async def get_private_config_from_api(config, device_id, client_id):
    """Lấy cấu hình riêng từ Java API"""
    return await get_agent_models(device_id, client_id, config["selected_module"])


def ensure_directories(config):
    """Đảm bảo tất cả các đường dẫn cấu hình đều tồn tại"""
    dirs_to_create = set()
    project_dir = get_project_dir()  # Lấy thư mục gốc dự án
    # Thư mục file log
    log_dir = config.get("log", {}).get("log_dir", "tmp")
    dirs_to_create.add(os.path.join(project_dir, log_dir))

    # Thư mục đầu ra của module ASR/TTS
    for module in ["ASR", "TTS"]:
        if config.get(module) is None:
            continue
        for provider in config.get(module, {}).values():
            output_dir = provider.get("output_dir", "")
            if output_dir:
                dirs_to_create.add(output_dir)

    # Tạo thư mục model dựa trên selected_module
    selected_modules = config.get("selected_module", {})
    for module_type in ["ASR", "LLM", "TTS"]:
        selected_provider = selected_modules.get(module_type)
        if not selected_provider:
            continue
        if config.get(module) is None:
            continue
        if config.get(selected_provider) is None:
            continue
        provider_config = config.get(module_type, {}).get(selected_provider, {})
        output_dir = provider_config.get("output_dir")
        if output_dir:
            full_model_dir = os.path.join(project_dir, output_dir)
            dirs_to_create.add(full_model_dir)

    # Tạo thư mục thống nhất (giữ lại việc tạo thư mục data gốc)
    for dir_path in dirs_to_create:
        try:
            os.makedirs(dir_path, exist_ok=True)
        except PermissionError:
            print(f"Cảnh báo: Không thể tạo thư mục {dir_path}, vui lòng kiểm tra quyền ghi")


def merge_configs(default_config, custom_config):
    """
    Hợp nhất cấu hình đệ quy, custom_config có độ ưu tiên cao hơn

    Args:
        default_config: Cấu hình mặc định
        custom_config: Cấu hình tùy chỉnh của người dùng

    Returns:
        Cấu hình sau khi hợp nhất
    """
    if not isinstance(default_config, Mapping) or not isinstance(
        custom_config, Mapping
    ):
        return custom_config

    merged = dict(default_config)

    for key, value in custom_config.items():
        if (
            key in merged
            and isinstance(merged[key], Mapping)
            and isinstance(value, Mapping)
        ):
            merged[key] = merge_configs(merged[key], value)
        else:
            merged[key] = value

    return merged
