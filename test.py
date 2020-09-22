import sys

import pygame as pg
from pygame.locals import *

vec = pg.math.Vector2

CYAN = (0, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

class Laser:
    def __init__(self, color, size):
        self.color = color
        self.size = size
        self.length = 35 * self.size
        self.pos = vec(0, 0)
        self.vel = vec(0, 0)
        self.lifetime = 0

    def update(self, dt):
        self.lifetime += dt
        self.pos += self.vel * dt
        if self.pos.y > 660:
            self.pos = vec(0, 0)
            self.lifetime = 0

    def draw(self, screen):
        streak_end = -self.vel.normalize() * self.length + self.pos
        last = streak_end
        lerp_amount = 0.3
        if self.lifetime > (self.length / self.vel.length()):
            for i in range(20):
                pg.draw.circle(screen, self.color, last, self.size)
                last = last.lerp(self.pos, lerp_amount)

class Fighter:
    def __init__(self):
        self.color = WHITE
        self.local_points = (
            vec(0, 20),
            vec(12, -20),
            vec(0, -10),
            vec(-12, -20)
        )
        self.pos = vec(0, 0)
        self.vel = vec(0, 0)
        self.rot = 180

    def global_points(self):
        points = []
        for p in self.local_points:
            rotated = p.rotate(self.rot)
            points.append(self.pos - rotated)
        return points

    def draw(self, screen):
        pg.draw.polygon(screen, self.color, self.global_points())

def main():
    pg.init()
    screen = pg.display.set_mode([900, 600])
    screen.fill(BLACK)
    clock = pg.time.Clock()

    lasers = []

    for i in range(5):
        laser = Laser(RED, 4)
        laser.vel = vec(800, 0).rotate(40 + i * 5)
        lasers.append(laser)

    f = Fighter()
    f.pos = vec(450, 300)

    while True:
        dt = clock.tick(60) / 1000.0
        evts = pg.event.get()
        for evt in evts:
            if evt.type == QUIT:
                pg.quit()
                sys.exit()

        for laser in lasers:
            laser.update(dt)

        screen.fill(BLACK)
        for laser in lasers:
            laser.draw(screen)
        f.draw(screen)
        pg.display.flip()

if __name__ == "__main__":
    main()