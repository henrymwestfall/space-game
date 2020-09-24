import sys
import random
import math

import pygame as pg
from pygame.locals import *

vec = pg.math.Vector2

CYAN = (0, 255, 255)
ORANGE = (255, 165, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

def centroid(points):
    x_sum = 0
    y_sum = 0
    for p in points:
        x_sum += p.x
        y_sum += p.y
    c = len(points)
    return vec(x_sum / c, y_sum / c)

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

        self.exploding = False
        self.exploding_start = None
        self.explosion_life = 0.2

    def update(self, dt, t):
        if self.exploding and t - self.exploding_start > self.explosion_life:
            self.universe.bodies.remove(self)
            del self
            return

        self.lifetime += dt
        self.pos += self.vel * dt

        if self.lifetime > dt:
            for body in self.universe.bodies:
                if isinstance(body, Laser):
                    continue

                if not body.aabb_rect().collidepoint(self.pos):
                    continue

                if body.radius_collision(self.pos):
                    self.exploding = True
                    self.exploding_start = t
                    self.vel.rotate_ip(random.randint(-30, 30))
                    body.health -= round(7 - self.lifetime)

        if self.lifetime > 5:
            self.universe.bodies.remove(self)
            del self

    def draw(self, screen):
        if self.exploding:
            self.universe.draw_circle(screen, ORANGE, self.pos, self.size * 5)
            return

        streak_end = -self.vel.normalize() * self.length + self.pos
        last = streak_end
        lerp_amount = 0.3
        if self.lifetime > (self.length / self.vel.length()):
            for i in range(20):
                self.universe.draw_circle(screen, self.color, last, self.size)
                last = last.lerp(self.pos, lerp_amount)
        else:
            self.universe.draw_circle(screen, self.color, self.pos, self.size)

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
        self.approx_radius = 0
        center = centroid(self.local_points)
        for p in self.local_points:
            self.approx_radius = max(self.approx_radius, center.distance_to(p))

        self.pos = vec(0, 0)
        self.vel = vec(0, 0)
        self.rot = 65

        self.rot_speed = 360
        self.fly_speed = 1000
        self.acceleration = 300
        self.dec = 1.0

        self.last_laser_shot = -100
        self.shot_delay = 0.2

        self.health = 100
        self.faction = 0

        self.universe.bodies.append(self)

    def global_points(self):
        points = []
        for p in self.local_points:
            rotated = p.rotate(self.rot)
            points.append(self.pos - rotated)
        return points

    def aabb_rect(self):
        xmin = float('inf')
        ymin = float('inf')
        xmax = 0
        ymax = 0
        for p in self.global_points():
            xmin = min(xmin, p.x)
            ymin = min(ymin, p.y)
            xmax = max(xmax, p.x)
            ymax = max(ymax, p.y)
        w = xmax - xmin
        h = ymax - ymin
        return pg.Rect(xmin, ymin, w, h)

    def radius_collision(self, point):
        distance_squared = centroid(self.global_points()).distance_squared_to(point)
        return distance_squared <= self.approx_radius ** 2

    def update(self, dt, t):
        caption = f"Shields at {self.health}% Coordinates: ({round(self.pos.x)}, {round(self.pos.y)}) Speed: {round(self.vel.length())} px/s)"
        pg.display.set_caption(caption)
        if self.health <= 0:
            self.health = 0
            self.color = ORANGE
            self.pos += self.vel * dt
            return

        keys = pg.key.get_pressed()
        
        if keys[K_LEFT]:
            self.rot -= self.rot_speed * dt
        elif keys[K_RIGHT]:
            self.rot += self.rot_speed * dt

        if keys[K_UP]:
            self.vel += -vec(0, self.acceleration).rotate(self.rot) * dt
        else:
            self.vel = self.vel.lerp(vec(0, 0), self.dec * dt)
        if self.vel.length() > self.fly_speed:
            self.vel = self.vel.normalize() * self.fly_speed

        if keys[K_SPACE]:
            self.fire_laser(t)

        self.pos += self.vel * dt

    def fire_laser(self, t):
        if t - self.last_laser_shot > self.shot_delay:
                self.last_laser_shot = t
                l = Laser(self.universe, CYAN, 1)
                l.vel = -vec(0, self.vel.length() + 500).rotate(self.rot)
                l.pos = self.global_points()[0]

    def draw(self, screen):
        self.universe.draw_poly(screen, self.color, self.global_points())


class AIFighter(Fighter):
    def __init__(self, universe, pos, faction):
        super().__init__(universe)
        self.pos = pos
        self.target = None
        self.color = RED

        self.faction = faction

    def update(self, dt, t):
        if self.health <= 0:
            self.color = ORANGE
            self.pos += self.vel * dt
            return

        closest = None
        closest_distance = 1000000
        for body in self.universe.bodies:
            if closest is None:
                closest = body
            if not isinstance(body, Fighter):
                continue
            if body.faction == self.faction or body.health <= 0:
                continue

            distance_squared = self.pos.distance_squared_to(body.pos)
            if distance_squared < closest_distance:
                closest_distance = distance_squared
                closest = body
        self.target = closest

        if self.rot < 0:
            self.rot = 360 + self.rot
        elif self.rot > 360:
            self.rot %= 360

        desired_angle = vec(0, 1).angle_to(self.pos - self.target.pos)
        desired_rotation = desired_angle - self.rot
        if desired_rotation < 0:
            desired_rotation += 360
        if desired_rotation > 360:
            desired_rotation -= 360

        # rotate as much as possible
        max_rotation_amount = self.rot_speed * dt
        if max_rotation_amount > desired_rotation:
            self.rot += desired_rotation
        else:
            self.rot += math.copysign(desired_rotation, max_rotation_amount)

        if abs(desired_rotation) < 30 and self.target.health > 0 and self.faction != self.target.faction:
            self.fire_laser(t)

        if self.pos.distance_to(self.target.pos) > 300 and abs(desired_rotation) < 10:
            self.vel += -vec(0, self.acceleration).rotate(self.rot) * dt
        else:
            self.vel = self.vel.lerp(vec(0, 0), self.dec * dt)
        if self.vel.length() > self.fly_speed:
            self.vel = self.vel.normalize() * self.fly_speed

        self.pos += self.vel * dt


class BGStar:
    def __init__(self, universe):
        self.universe = universe
        self.parallax = random.randint(1, 50) * 0.01
        self.size = self.parallax * 4

        self.pos = vec(random.randint(-200000, 200000), random.randint(-150000, 150000))

        self.universe.particles.append(self)

    def draw(self, screen):
        self.universe.draw_circle(screen, WHITE, self.pos, self.size, self.parallax)


class Universe:
    def __init__(self):
        self.bodies = []
        self.particles = []
        self.zoom = 1
        self.camera = vec(0, 0)
        self.focus = None

    def update(self, dt, t):
        if not (self.focus is None):
            self.camera = self.focus.pos - vec(450, 300) * 1 / self.zoom
            if self.focus.vel.length() > 300:
                self.zoom = vec(self.zoom, 0).lerp(vec(0.5, 0), 0.5 * dt).x
            else:
                self.zoom = vec(self.zoom, 0).lerp(vec(1, 0), 0.5 * dt).x

        for b in self.bodies:
            b.update(dt, t)

    def draw_poly(self, screen, color, global_points, parallax=1):
        points = [self.get_render_point(p, parallax) for p in global_points]
        pg.draw.polygon(screen, color, points)
    
    def draw_circle(self, screen, color, global_center, radius, parallax=1):
        center = self.get_render_point(global_center, parallax)
        pg.draw.circle(screen, color, center, max(1, radius * self.zoom))

    def get_render_point(self, point, parallax=1):
        return (vec(point) - self.camera) * self.zoom * parallax


def main():
    pg.init()
    screen = pg.display.set_mode([900, 600])
    screen_rect = screen.get_rect()
    screen.fill(BLACK)
    clock = pg.time.Clock()

    u = Universe()

    for i in range(10000):
        BGStar(u)

    f = Fighter(u)
    f.pos = vec(450, 300)
    u.focus = f

    for i in range(3):
        enemy = AIFighter(u, vec(1000 * i, 0), 1)
        # ally = AIFighter(u, vec(1000 * i, 1000 * i), 0)
        # ally.color = GREEN

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
        for p in u.particles:
            if screen_rect.collidepoint(u.get_render_point(p.pos, p.parallax)):
                p.draw(screen)
        pg.display.flip()

if __name__ == "__main__":
    main()
