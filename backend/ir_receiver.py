from machine import Pin
from UpyIrRx import UpyIrRx
from UpyIrTx import UpyIrTx
# 赤外線受信のためのピンを指定
rx_pin = Pin(14, Pin.IN)  # 例としてGPIO14を使用
# UpyIrRxクラスのインスタンスを作成
rx = UpyIrRx(rx_pin)

tx_pin = Pin(21, Pin.OUT)  # Pin No.26
tx = UpyIrTx(0,tx_pin)
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
else:
    print("取得失敗: エラーコード", error_code)
    
if signal_list:
    tx.send(signal_list)
