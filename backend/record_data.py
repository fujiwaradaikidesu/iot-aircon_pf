import ujson
import utime
import uos
from UpyIrRx import UpyIrRx
from machine import Pin
import random

class IrSignalRecorder:
    def __init__(self, ir_pin_num):
        self.ir_rx = UpyIrRx(Pin(ir_pin_num))
        self.base_dir = "signals"
        self._ensure_directory_structure()
        self.all_signals = self._load_all_signals()
    
    def _ensure_directory_structure(self):
        """ディレクトリ構造を確保"""
        dirs = [
            self.base_dir,
            self.base_dir + "/power_on",
            self.base_dir + "/power_on/true",
            self.base_dir + "/power_on/false",
            self.base_dir + "/mode",
            self.base_dir + "/mode/cool",
            self.base_dir + "/mode/heat"
        ]
        
        for dir_path in dirs:
            try:
                uos.mkdir(dir_path)
            except OSError:
                pass  # ディレクトリが既に存在する場合は無視
    
    def _get_signal_path(self, power_on, mode, temperature, fan_speed):
        """信号ファイルのパスを生成"""
        power_dir = "true" if power_on else "false"
        mode_dir = "cool" if mode == "cool" else "heat"
        
        return "{}/power_on/{}/mode_{}/temp_{}/fan_{}.json".format(
            self.base_dir,
            power_dir,
            mode_dir,
            temperature,
            fan_speed
        )
    
    def record_signal(self, power_on, mode, temperature, fan_speed):
        """信号を記録"""
        try:
            print("信号を受信待機中...")
            error = self.ir_rx.record()
            if error != 0:
                return False, f"信号受信エラー: {error}"
            
            signal_list = self.ir_rx.get_calibrate_list()
            if not signal_list:
                return False, "信号データが取得できませんでした"
            
            file_path = self._get_signal_path(power_on, mode, temperature, fan_speed)
            
            # ディレクトリが存在しない場合は作成
            dir_path = '/'.join(file_path.split('/')[:-1])
            try:
                # 親ディレクトリから順に作成
                current_dir = ""
                for part in dir_path.split('/'):
                    current_dir = current_dir + '/' + part if current_dir else part
                    try:
                        uos.mkdir(current_dir)
                    except OSError:
                        pass
            except Exception as e:
                print(f"ディレクトリ作成エラー: {e}")
            
            # 信号データを保存
            with open(file_path, 'w') as f:
                ujson.dump({
                    "power_on": power_on,
                    "mode": mode,
                    "temperature": temperature,
                    "fan_speed": fan_speed,
                    "signal_data": signal_list
                }, f)
            
            print(f"信号を保存しました: {file_path}")
            return True, f"信号を保存しました: {file_path}"
            
        except Exception as e:
            print(f"信号保存エラー: {e}")
            return False, f"信号保存エラー: {e}"
    
    def search_signals(self, power_on=None, mode=None, temperature=None, fan_speed=None):
        """条件に合う信号を検索（優先度: power_on > mode > temperature > fan_speed）"""
        try:
            # 検索パターンを生成
            power_pattern = "*" if power_on is None else ("true" if power_on else "false")
            mode_pattern = "*" if mode is None else mode
            temp_pattern = "*" if temperature is None else str(temperature)
            fan_pattern = "*" if fan_speed is None else str(fan_speed)
            
            # 検索パスを生成
            search_path = "{}/power_on/{}/mode_{}/temp_{}/fan_{}.json".format(
                self.base_dir,
                power_pattern,
                mode_pattern,
                temp_pattern,
                fan_pattern
            )
            
            # ファイルを検索
            signals = []
            for file_path in self._find_files(search_path):
                with open(file_path, 'r') as f:
                    signal_data = ujson.load(f)
                    signals.append(signal_data)
            
            if not signals:
                print(f"条件に合う信号が見つかりません")
                print(f"power_on: {power_on}, mode: {mode}, temperature: {temperature}, fan_speed: {fan_speed}")
                return None
            
            # 優先度に基づいて信号をフィルタリング
            filtered_signals = self.all_signals
            
            # 1. power_onでフィルタリング
            if power_on is not None:
                filtered_signals = [s for s in filtered_signals if s["power_on"] == power_on]
                if not filtered_signals:
                    filtered_signals = signals  # 一致するものがなければ元のリストに戻す
            
            # 2. modeでフィルタリング
            if mode is not None:
                temp_filtered = [s for s in filtered_signals if s["mode"] == mode]
                if temp_filtered:
                    filtered_signals = temp_filtered
            
            # 3. temperatureでフィルタリング
            if temperature is not None:
                temp_filtered = [s for s in filtered_signals if s["temperature"] == temperature]
                if temp_filtered:
                    filtered_signals = temp_filtered
            
            # 4. fan_speedでフィルタリング
            if fan_speed is not None:
                temp_filtered = [s for s in filtered_signals if s["fan_speed"] == fan_speed]
                if temp_filtered:
                    filtered_signals = temp_filtered
            
            # フィルタリングされた信号から1つをランダムに選択
            selected_signal = random.choice(filtered_signals)
            return selected_signal
            
        except Exception as e:
            print(f"信号検索エラー: {e}")
            return None
    
    def _find_files(self, pattern):
        """パターンに一致するファイルを再帰的に検索"""
        try:
            result = []
            
            def search_dir(current_dir):
                try:
                    for entry in uos.listdir(current_dir):
                        full_path = current_dir + '/' + entry
                        stat = uos.stat(full_path)
                        
                        # ディレクトリの場合
                        if stat[0] & 0x4000:
                            # 再帰的に検索
                            search_dir(full_path)
                        # ファイルの場合（.jsonで終わるファイルのみ）
                        elif entry.endswith('.json'):
                            # パターンに一致するかチェック
                            if self._match_pattern(full_path, pattern):
                                result.append(full_path)
                except Exception as e:
                    print(f"検索エラー ({current_dir}): {e}")
            
            # 検索開始
            search_dir(self.base_dir)
            return result
            
        except Exception as e:
            print(f"検索エラー: {e}")
            return []
    
    def _match_pattern(self, path, pattern):
        """パスがパターンに一致するかチェック"""
        try:
            # パスとパターンをパーツに分割
            path_parts = path.split('/')
            pattern_parts = pattern.split('/')
            
            # パーツ数が異なる場合は一致しない
            if len(path_parts) != len(pattern_parts):
                return False
            
            # 各パーツを比較
            for path_part, pattern_part in zip(path_parts, pattern_parts):
                # ワイルドカードの場合はスキップ
                if pattern_part == '*':
                    continue
                # パターンがパスに含まれていない場合は一致しない
                if pattern_part not in path_part:
                    return False
            
            return True
            
        except Exception as e:
            print(f"パターンマッチングエラー: {e}")
            return False
    
    def delete_signal(self, power_on, mode, temperature, fan_speed):
        """信号を削除"""
        try:
            file_path = self._get_signal_path(power_on, mode, temperature, fan_speed)
            if file_path in uos.listdir(os.path.dirname(file_path)):
                uos.remove(file_path)
                print(f"信号を削除しました: {file_path}")
                return True, "信号を削除しました"
            print(f"信号が見つかりません: {file_path}")
            return False, "信号が見つかりません"
        except Exception as e:
            print(f"信号削除エラー: {e}")
            return False, f"信号削除エラー: {e}"
    
    def list_signals(self):
        """保存されている全ての信号をリスト表示"""
        try:
            signal_files = self._find_files(self.base_dir + "/**/*.json")
            
            if not signal_files:
                print("保存されている信号はありません")
                return []
            
            signals = []
            for file_path in signal_files:
                with open(file_path, 'r') as f:
                    signal_data = ujson.load(f)
                    signals.append({
                        "file": file_path,
                        "power_on": signal_data["power_on"],
                        "mode": signal_data["mode"],
                        "temperature": signal_data["temperature"],
                        "fan_speed": signal_data["fan_speed"]
                    })
            
            print("\n=== 保存されている信号 ===")
            for signal in signals:
                print(f"ファイル: {signal['file']}")
                print(f"電源: {'ON' if signal['power_on'] else 'OFF'}")
                print(f"モード: {signal['mode']}")
                print(f"温度: {signal['temperature']}度")
                print(f"風量: {signal['fan_speed']}")
                print("------------------------")
            
            return signals
            
        except Exception as e:
            print(f"信号リスト取得エラー: {e}")
            return []
    
    def _load_all_signals(self):
        """全ての信号をメモリにロード"""
        try:
            signals = []
            # 全てのJSONファイルを検索
            for file_path in self._find_files(self.base_dir + "/**/*.json"):
                with open(file_path, 'r') as f:
                    signal_data = ujson.load(f)
                    signals.append(signal_data)
            return signals
        except Exception as e:
            print(f"信号ロードエラー: {e}")
            return []

# 使用例
if __name__ == "__main__":
    # IR受信ピンの番号を指定（例：GPIO 14）
    recorder = IrSignalRecorder(14)
    
    # 信号の記録（例：電源ON、冷房、温度25度、風の強さ3）
    success, message = recorder.record_signal(
        power_on=True,
        mode="cool",
        temperature=25,
        fan_speed=3
    )
    
    # 保存されている信号の一覧を表示
    recorder.list_signals()

