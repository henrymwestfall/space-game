import sys
import random

import pygame as pg
from pygame.locals import *

vec = pg.math.Vector2

CYAN = (0, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

class Laser:
    def __init__(self, universe, color, size):
        self.universe = universe
        self.color = color
        self.size = size
        self.length = 35 * self.size
        self.pos = vec(0, 0)
        self.vel = vec(0, 0)
        self.lifetime = 0

        self.universe.bodies.append(self)

    def update(self, dt, t):
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
        else:
            pg.draw.circle(screen, self.color, self.pos, self.size)

class Fighter:
    def __init__(self, universe):
        self.universe = universe
        self.color = WHITE
        self.local_points = (
            vec(0, 15),
            vec(12, -15),
            vec(0, -10),
            vec(-12, -15)
        )
        self.pos = vec(0, 0)
        self.vel = vec(0, 0)
        self.rot = 65

        self.rot_speed = 360
        self.fly_speed = 1000
        self.acceleration = 300
        self.dec = 1.0

        self.last_laser_shot = -100
        self.shot_delay = 0.2

        self.universe.bodies.append(self)

    def global_points(self):
        points = []
        for p in self.local_points:
            rotated = p.rotate(self.rot)
            points.append(self.pos - rotated)
        return points

    def update(self, dt, t):
        keys = pg.key.get_pressed()
        
        if keys[K_LEFT]:
            self.rot -= self.rot_speed * dt
        elif keys[K_RIGHT]:
            self.rot += self.rot_speed * dt

        if keys[K_UP]:
            self.vel += -vec(0, self.acceleration).rotate(self.rot) * dt
        else:
            self.vel = self.vel.lerp(vec(0, 0), self.dec * dt)

        if keys[K_SPACE]:
            if t - self.last_laser_shot > self.shot_delay:
                self.last_laser_shot = t
                l = Laser(self.universe, CYAN, 1)
                l.vel = -vec(0, self.vel.length() + 200).rotate(self.rot)
                l.pos = self.global_points()[0]

        self.pos += self.vel * dt

    def draw(self, screen):
        self.universe.draw_poly(screen, self.color, self.global_points())


class BGStar:
    def __init__(self, universe):
        self.universe = universe
        self.parallax = random.random() ** 2

        self.universe.particles.append(self)

    def draw(self, screen):
        self.universe.draw_circle(screen, WHITE, )


class Universe:
    def __init__(self):
        self.bodies = []
        self.particles = []
        self.zoom = 1
        self.camera = vec(0, 0)
        self.focus = None

    def update(self, dt, t):
        if not (self.focus is None):
            self.camera = self.focus.pos - vec(450, 300)

        for b in self.bodies:
            b.update(dt, t)

    def draw_poly(self, screen, color, global_points, parallax=1):
        points = [vec(p) * self.zoom * parallax - self.camera for p in global_points]
        pg.draw.polygon(screen, color, points)
    
    def draw_circle(self, screen, color, global_center, radius, parallax=1):
        center = vec(global_center) * self.zoom * parallax - self.camera
        pg.draw.circle(screen, color, center, radius)


def main():
    pg.init()
    screen = pg.display.set_mode([900, 600])
    screen.fill(BLACK)
    clock = pg.time.Clock()

    u = Universe()

    # for i in range(5):
    #     laser = Laser(RED, 4)
    #     laser.vel = vec(800, 0).rotate(40 + i * 5)
    #     lasers.append(laser)

    f = Fighter(u)
    f.pos = vec(450, 300)
    u.focus = f

    t = 0

    while True:
        dt = clock.tick(60) / 1000.0
        t += dt
        evts = pg.event.get()
        for evt in evts:
            if evt.type == QUIT:
                pg.quit()
                sys.exit()

        u.update(dt, t)

        screen.fill(BLACK)
        for b in u.bodies:
            b.draw(screen)
        pg.display.flip()

if __name__ == "__main__":
    main()
