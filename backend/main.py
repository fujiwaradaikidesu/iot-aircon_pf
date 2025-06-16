import json
from machine import Pin
import UpyIrTx
import time
from record_data import IrSignalRecorder
from esp32_wifi_server import WiFiConfig, ESP32Server
import socket
import gc
import machine
import micropython
from dotenv import load_dotenv
import os

# 環境変数を読み込む
load_dotenv()

def print_system_stats():
    """システムのリソース使用状況を表示"""
    gc.collect()  # ガベージコレクションを実行
    free_mem = gc.mem_free()
    allocated_mem = gc.mem_alloc()
    total_mem = free_mem + allocated_mem
    mem_usage = (allocated_mem / total_mem) * 100
    
    print("\n=== システムリソース使用状況 ===")
    print(f"メモリ使用量: {allocated_mem:,} bytes / {total_mem:,} bytes ({mem_usage:.1f}%)")
    print(f"空きメモリ: {free_mem:,} bytes")
    print(f"スタック使用量: {micropython.stack_use():,} bytes")
    print("==============================\n")

class AirConditionerController:
    def __init__(self, ir_tx_pin, ir_rx_pin, signal_led_pin=32):
        # 信号の受信と送信用
        self.signal_recorder = IrSignalRecorder(ir_rx_pin)
        # 信号の送信用ピンを設定
        self.ir_tx = UpyIrTx.UpyIrTx(0, Pin(ir_tx_pin, Pin.OUT))
        # 信号送信用LED
        self.signal_led = Pin(signal_led_pin, Pin.OUT)
    
    def control(self, power_on: bool, mode: str, temperature: int, fan_speed: int):
        """
        エアコンの制御を行う
        
        Args:
            power_on (bool): 電源の状態（True: オン, False: オフ）
            mode (str): モード（"cool": 冷房, "heat": 暖房）
            temperature (int): 温度
            fan_speed (int): 風の強さ
        """
        # 信号データベースから条件に合う信号を検索
        signals = self.signal_recorder.search_signals(
            power_on=power_on,
            mode=mode,
            temperature=temperature,
            fan_speed=fan_speed
        )
        print("信号を取得")
        
        # signalsがNoneまたは空のリストの場合
        if signals is None or not signals:
            print(f"エラー: 条件に合う信号が見つかりません")
            print(f"power_on: {power_on}, mode: {mode}, temperature: {temperature}, fan_speed: {fan_speed}")
            return False
        
        # 最初に見つかった信号を使用
        signal_data = signals["signal_data"]
        
        # 信号を送信
        try:
            # LEDを点滅
            self.signal_led.value(1)  # LEDを点灯
            for _ in range(1):
                self.ir_tx.send(signal_data)
                time.sleep(1)
            time.sleep(0.1)  # 少し待つ
            self.signal_led.value(0)  # LEDを消灯
            return True
        except Exception as e:
            print(f"信号送信エラー: {e}")
            return False
    
    def learn_signal(self, power_on: bool, mode: str, temperature: int, fan_speed: int):
        """
        エアコンの信号を学習する
        
        Args:
            power_on (bool): 電源の状態（True: オン, False: オフ）
            mode (str): モード（"cool": 冷房, "heat": 暖房）
            temperature (int): 温度
            fan_speed (int): 風の強さ
            
        Returns:
            bool: 学習が成功したかどうか
        """
        try:
            # 信号を記録
            success, message = self.signal_recorder.record_signal(
                power_on=power_on,
                mode=mode,
                temperature=temperature,
                fan_speed=fan_speed
            )
            
            if success:
                print("信号を学習しました:", message)
                # 学習成功時もLEDを点滅
                self.signal_led.value(1)
                time.sleep(0.1)
                self.signal_led.value(0)
                return True
            else:
                print("信号の学習に失敗しました:", message)
                return False
                
        except Exception as e:
            print(f"信号学習エラー: {e}")
            return False

class AirConditionerServer(ESP32Server):
    def __init__(self, wifi_config, controller, port=80, led_connected_pin=22, led_disconnected_pin=23):
        super().__init__(wifi_config, port, led_connected_pin, led_disconnected_pin)
        self.controller = controller
        self._setup_aircon_routes()
        self._last_stats_time = time.ticks_ms()
        self._stats_interval = 5000  # 5秒ごとに統計を表示
    
    def _check_and_print_stats(self):
        """定期的にシステム統計を表示"""
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, self._last_stats_time) >= self._stats_interval:
            print_system_stats()
            self._last_stats_time = current_time

    def _setup_aircon_routes(self):
        """エアコン制御用のルートを設定"""
        self.add_route('/aircon/control', self.handle_aircon_control)
        self.add_route('/aircon/status', self.handle_aircon_status)
        self.add_route('/aircon/learn', self.handle_aircon_learn)
    
    def handle_aircon_control(self, params):
        """エアコン制御リクエストを処理"""
        self._check_and_print_stats()
        try:
            # パラメータの取得とバリデーション
            power_on = params.get('power_on', '').lower() == 'true'
            mode = params.get('mode', '')
            temperature = int(params.get('temperature', 0))
            fan_speed = int(params.get('fan_speed', 0))
            
            print("\n=== エアコン制御リクエスト ===")
            print(f"電源: {'ON' if power_on else 'OFF'}")
            print(f"モード: {mode}")
            print(f"温度: {temperature}度")
            print(f"風量: {fan_speed}")
            print("==========================\n")
            
            # エアコンを制御
            success = self.controller.control(
                power_on=power_on,
                mode=mode,
                temperature=temperature,
                fan_speed=fan_speed
            )
            
            if success:
                return {'status': 'success', 'message': 'OK'}, 200
            else:
                return {'status': 'error', 'message': 'Control failed'}, 500
                
        except Exception as e:
            print(f"エラー: {e}")
            return {'status': 'error', 'message': 'Internal error'}, 500
    
    def handle_aircon_status(self, params):
        """エアコンの状態を取得"""
        print("\n=== 状態確認リクエスト ===")
        print("システムの状態を確認します")
        print("==========================\n")
        return {'status': 'success', 'message': 'OK'}, 200
    
    def handle_aircon_learn(self, params):
        """エアコンの信号を学習"""
        try:
            # パラメータの取得とバリデーション
            power_on = params.get('power_on', '').lower() == 'true'
            mode = params.get('mode', '')
            temperature = int(params.get('temperature', 0))
            fan_speed = int(params.get('fan_speed', 0))
            
            print("\n=== 信号学習リクエスト ===")
            print(f"電源: {'ON' if power_on else 'OFF'}")
            print(f"モード: {mode}")
            print(f"温度: {temperature}度")
            print(f"風量: {fan_speed}")
            print("信号の受信を待機します...")
            print("==========================\n")
            
            # 信号を学習
            success = self.controller.learn_signal(
                power_on=power_on,
                mode=mode,
                temperature=temperature,
                fan_speed=fan_speed
            )
            
            if success:
                return {'status': 'success', 'message': 'OK'}, 200
            else:
                return {'status': 'error', 'message': 'Learn failed'}, 500
                
        except Exception as e:
            print(f"エラー: {e}")
            return {'status': 'error', 'message': 'Internal error'}, 500

# 使用例
if __name__ == "__main__":
    # ピン番号の設定
    IR_TX_PIN = 13
    IR_RX_PIN = 14
    LED_CONNECTED_PIN = 21
    LED_DISCONNECTED_PIN = 23
    SIGNAL_LED_PIN = 32
    
    # コントローラーの作成
    controller = AirConditionerController(
        IR_TX_PIN, 
        IR_RX_PIN,
        signal_led_pin=SIGNAL_LED_PIN
    )
    
    # WiFi設定
    wifi_config = WiFiConfig(
        ssid=os.getenv("WIFI_SSID", "ssid"),
        password=os.getenv("WIFI_PASSWORD", "pass"),
        static_ip=os.getenv("WIFI_STATIC_IP", "ip"),
        subnet_mask=os.getenv("WIFI_SUBNET_MASK", "255.255.255.0"),
        gateway=os.getenv("WIFI_GATEWAY", "gateway"),
        dns=os.getenv("WIFI_DNS", "8.8.8.8")
    )
    # サーバーの作成と開始
    server = AirConditionerServer(
       wifi_config, 
       controller,
       led_connected_pin=LED_CONNECTED_PIN,
       led_disconnected_pin=LED_DISCONNECTED_PIN
    )

    server.start()
