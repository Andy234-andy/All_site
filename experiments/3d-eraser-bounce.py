import numpy as np
import matplotlib.pyplot as plt

# --- 設定 ---
NUM_DROPS = 3000  # 3Dで立体が綺麗に見えやすいように3000回に調整
MAX_BOUNCES = 5


def drop_eraser_3d():
    """着地位置(X, Y)と、道中の最高高度(Z)を計算するモデル"""
    x, y = 0.0, 0.0
    max_height = 0.0  # これまでの最高高度を記録する変数

    init_angle = np.random.uniform(0, 2 * np.pi)
    init_speed = np.random.exponential(0.5)
    vx = init_speed * np.cos(init_angle)
    vy = init_speed * np.sin(init_angle)

    num_bounces = np.random.randint(2, MAX_BOUNCES + 1)

    for _ in range(num_bounces):
        x += vx
        y += vy

        # 今回のバウンドの「高さ（最高高度）」を物理的に概算
        current_speed = np.hypot(vx, vy)
        bounce_height = (current_speed ** 2) * np.random.uniform(0.1, 0.5)

        # 過去最高の高さを更新したら記録
        if bounce_height > max_height:
            max_height = bounce_height

        # 次のバウンドへのカオスな角度シャッフル
        bounce_angle = np.random.uniform(0, 2 * np.pi)
        bounce_speed = np.random.uniform(0.2, 0.8) * current_speed

        if np.random.rand() > 0.7:
            bounce_speed += np.random.uniform(2.0, 7.0)

        vx = bounce_speed * np.cos(bounce_angle)
        vy = bounce_speed * np.sin(bounce_angle)

    return x, y, max_height


# --- データの生成 ---
x_data, y_data, z_data = [], [], []

for _ in range(NUM_DROPS):
    x, y, z = drop_eraser_3d()
    x_data.append(x)
    y_data.append(y)
    z_data.append(z)

# --- 3D描画の設定（ここを修正しました） ---
fig, ax = plt.subplots(figsize=(9, 8), subplot_kw={"projection": "3d"})

# 1. 空間に浮かぶ「最高高度」をプロット（高さに応じて色が変わるグラデーション）
scat = ax.scatter(x_data, y_data, z_data, c=z_data, cmap='viridis', s=4, alpha=0.7, depthshade=True)

# 2. 地面（Z=0の床）に「着地地点」の影（プロット）をグレーで描く
ax.scatter(x_data, y_data, np.zeros_like(z_data), c='gray', s=2, alpha=0.15)

# 見た目の調整
ax.set_xlim(-15, 15)
ax.set_ylim(-15, 15)
ax.set_zlim(0, 15)  # 高さの限界を設定

ax.set_xlabel('X (Floor)')
ax.set_ylabel('Y (Floor)')
ax.set_zlabel('Max Height (Z)')
plt.title("3D Eraser Bounce: Trajectory & Max Height", fontsize=12)

# 最初に見やすい角度にカメラを調整
ax.view_init(elev=25, azim=45)

plt.show()
