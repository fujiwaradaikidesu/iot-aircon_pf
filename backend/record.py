# 理由は不明だが、このプログラムでしか信号保存がうまくいかない。
# ハードウェアのせいかも

from machine import Pin
from UpyIrRx import UpyIrRx
from UpyIrTx import UpyIrTx
import ujson

# 赤外線受信のためのピンを指定
rx_pin = Pin(14, Pin.IN)  # 例としてGPIO14を使用
# UpyIrRxクラスのインスタンスを作成
rx = UpyIrRx(rx_pin)

tx_pin = Pin(21, Pin.OUT)  # Pin No.26
tx = UpyIrTx(0,tx_pin)

# 信号データのパラメータ
power_on = True
mode = "cool"
temperature = 25
fan_speed = "auto"

# 3000ミリ秒以内に赤外線信号を受信
print("recording")
error_code = rx.record(1000)

# 記録が正常に完了したか確認
if rx.get_mode() == rx.MODE_DONE_OK:
    # 記録されたバイト列を取得
    signal_data = rx.get_calibrate_list()
    
    # バイト列を整数のリストに変換
    signal_list = signal_data
    print("取得成功")
    print("信号リスト:", signal_list)

    # JSONデータの作成と表示
    json_data = {
        "power_on": power_on,
        "mode": mode,
        "temperature": temperature,
        "fan_speed": fan_speed,
        "signal_data": signal_list
    }
    print("\nJSONデータ:")
    print(ujson.dumps(json_data, indent=2))
else:
    print("取得失敗: エラーコード", error_code)
    
#if signal_list:
#    tx.send(signal_list)
    
    