import network
import socket
import json
from machine import Pin
import time

class WiFiConfig:
    """WiFi設定を管理するクラス"""
    def __init__(self, ssid, password, static_ip=None, subnet_mask=None, gateway=None, dns=None):
        self.ssid = ssid
        self.password = password
        self.static_ip = static_ip
        self.subnet_mask = subnet_mask
        self.gateway = gateway
        self.dns = dns

class WiFiManager:
    """WiFi接続を管理するクラス"""
    def __init__(self, config):
        self.config = config
    
    def connect(self):
        """WiFiに接続"""
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        
        # 固定IPアドレスが設定されている場合は適用
        if self.config.static_ip:
            wlan.ifconfig((
                self.config.static_ip,
                self.config.subnet_mask,
                self.config.gateway,
                self.config.dns
            ))
        
        wlan.connect(self.config.ssid, self.config.password)
        
        # 接続を待機
        max_wait = 10
        while max_wait > 0:
            if wlan.isconnected():
                break
            max_wait -= 1
            time.sleep(1)
        
        if not wlan.isconnected():
            raise Exception('WiFi接続に失敗しました')
        
        return wlan.ifconfig()[0]

class HTTPRequest:
    def __init__(self, raw_request):
        self.raw_request = raw_request
        self.method = None
        self.path = None
        self.params = {}
        self._parse_request()
    
    def _parse_request(self):
        """生のHTTPリクエストを解析"""
        try:
            # リクエストの最初の行を取得
            first_line = self.raw_request.split('\r\n')[0]
            self.method, path_with_params = first_line.split(' ')[:2]
            
            # パスとパラメータを分離
            if '?' in path_with_params:
                self.path, param_str = path_with_params.split('?', 1)
                # パラメータを解析
                for param in param_str.split('&'):
                    if '=' in param:
                        key, value = param.split('=', 1)
                        self.params[key] = value
            else:
                self.path = path_with_params
                
        except Exception as e:
            print(f"リクエスト解析エラー: {e}")
            self.method = 'GET'
            self.path = '/'
            self.params = {}

class RouteHandler:
    """ルーティングを処理するクラス"""
    def __init__(self):
        self.routes = {}
    
    def add_route(self, path, handler):
        """ルートを追加"""
        self.routes[path] = handler
    
    def handle_request(self, request):
        """リクエストを処理"""
        if request.path in self.routes:
            return self.routes[request.path](request.params)
        else:
            return {'status': 'error', 'message': 'Not Found'}, 404

class ESP32Server:
    """ESP32のWebサーバー"""
    def __init__(self, wifi_config, port=80, led_connected_pin=22, led_disconnected_pin=23):
        self.wifi_config = wifi_config
        self.port = port
        self.wifi_manager = WiFiManager(wifi_config)
        self.route_handler = RouteHandler()
        
        # LED制御の設定
        self.led_connected = Pin(led_connected_pin, Pin.OUT)
        self.led_disconnected = Pin(led_disconnected_pin, Pin.OUT)
        # 初期状態（切断中）
        self.led_connected.value(0)
        self.led_disconnected.value(1)
    
    def add_route(self, path, handler):
        """ルートを追加"""
        self.route_handler.add_route(path, handler)
    
    def handle_request(self, client_socket):
        """クライアントからのリクエストを処理"""
        try:
            # リクエストを受信
            request = client_socket.recv(1024).decode('utf-8')
            if not request:
                return
            
            # リクエストを解析
            http_request = HTTPRequest(request)
            
            # ルートハンドラで処理
            response_data, status_code = self.route_handler.handle_request(http_request)
            
            # シンプルなJSONレスポンスを生成
            json_str = '{"status":"success","message":"OK"}'
            
            # レスポンスを生成
            response = "HTTP/1.1 200 OK\r\n"
            response += "Content-Type: application/json\r\n"
            response += "Access-Control-Allow-Origin: *\r\n"
            response += "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
            response += "Access-Control-Allow-Headers: Content-Type\r\n"
            response += "Content-Length: {}\r\n".format(len(json_str))
            response += "\r\n"
            response += json_str
            
            # レスポンスを送信
            client_socket.send(response.encode('utf-8'))
            client_socket.close()
            
        except Exception as e:
            print(f"リクエスト処理エラー: {e}")
            error_json = '{"status":"error","message":"Internal Server Error"}'
            error_response = "HTTP/1.1 500 Internal Server Error\r\n"
            error_response += "Content-Type: application/json\r\n"
            error_response += "Access-Control-Allow-Origin: *\r\n"
            error_response += "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
            error_response += "Access-Control-Allow-Headers: Content-Type\r\n"
            error_response += "Content-Length: {}\r\n".format(len(error_json))
            error_response += "\r\n"
            error_response += error_json
            client_socket.send(error_response.encode('utf-8'))
            client_socket.close()
    
    def start(self):
        """サーバーを開始"""
        try:
            ip_address = self.wifi_manager.connect()
            # WiFi接続成功時
            self.led_connected.value(1)
            self.led_disconnected.value(0)
            print(f'サーバーを開始しました。ポート: {self.port}')
            print(f'アクセスURL: http://{ip_address}')
            
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind(('', self.port))
            s.listen(5)
            
            while True:
                client, addr = s.accept()
                print('クライアント接続:', addr)
                self.handle_request(client)
                
        except Exception as e:
            # WiFi接続失敗時
            self.led_connected.value(0)
            self.led_disconnected.value(1)
            print(f'WiFi接続エラー: {e}')
            raise e

# 使用例
if __name__ == "__main__":
    # WiFi設定（固定IPアドレス付き）
    wifi_config = WiFiConfig(
        ssid="ssid",
        password="pass",
        static_ip="ip",      # 固定IPアドレス
        subnet_mask="255.255.255.0",    # サブネットマスク
        gateway="gateway",          # デフォルトゲートウェイ
        dns="8.8.8.8"                   # DNSサーバー
    )
    
    # サーバーの作成と開始
    server = ESP32Server(wifi_config)
    server.start() 
