import numpy as np
import matplotlib.pyplot as plt

target_pos = np.array((100, 100))
my_pos = np.array((0, 0))

# plot current positions
xs = [target_pos[0], my_pos[0]]
ys = [target_pos[1], my_pos[1]]
styles = ["r.", "b."]
for i in range(2):
    plt.plot(xs[i], ys[i], styles[i], markersize=12)

target_vel = np.array((-10, 10))
my_vel = np.array((10, 10))

# plot velocities
plt.arrow(target_pos[0], target_pos[1], target_vel[0], target_vel[1], color="r", head_width=2, length_includes_head=True)
plt.arrow(my_pos[0], my_pos[1], my_vel[0], my_vel[1], color="b", head_width=2, length_includes_head=True)

# find rotation such that bullet will meet target
# 

plt.show()