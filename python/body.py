import random
import math

import pygame as pg
from pygame.locals import *

from colors import *

vec = pg.math.Vector2

class Body(object):
    def __init__(self, universe, pos):
        self.universe = universe
        self.universe.bodies.append(self)

        self.lifetime = 0

        self.pos = pos
        self.vel = vec(0, 0)

        self.dec = 0
    
    def update(self, dt, t):
        self.lifetime += dt
        self.vel = self.vel.lerp(vec(0, 0), self.dec * dt)
        if not self.process(dt, t):
            self.pos += self.vel * dt
        else: # kill self
            self.universe.bodies.remove(self)
            del self

    def process(self, dt, t):
        """ Override with unique update methods """
        pass


class CircularBody(Body):
    def __init__(self, universe, pos, color, radius):
        super().__init__(universe, pos)

        self.color = color
        self.radius = radius
        self.vel = vec(0, 0)
        self.rot = 0

    def get_aabb_rect(self):
        d = self.radius / 2
        rect = pg.Rect(0, 0, d, d)
        rect.center = self.pos
        return rect

    def draw(self, screen):
        self.universe.draw_circle(screen, self.color, self.pos, int(self.radius))

import projectiles
Laser = projectiles.Laser

class PolygonalBody(Body):
    def __init__(self, universe, pos, points, color):
        super().__init__(universe, pos)
        self.points = points
        self.center = self.centroid(self.points)
        self.approx_radius = 0
        for p in self.points:
            self.approx_radius = max(self.approx_radius, self.center.distance_to(p))
        self.color = color

        self.rot = 0

        self.cached_global_points = [-1, []]
        self.cached_aabb_rect = [-1, []]

    @classmethod
    def centroid(self, points):
        xsum = 0
        ysum = 0
        count = len(points)
        for p in points:
            xsum += p.x
            ysum += p.y
        return vec(xsum / count, ysum / count)

    def get_global_points(self, t=-1):
        # pass t for efficiency
        if t != -1 and t == self.cached_global_points[0]:
            return self.cached_global_points[1]
        
        points = []
        for p in self.points:
            rotated = p.rotate(self.rot)
            points.append(self.pos - rotated)
        if t != -1:
            self.cached_global_points = (t, points)
        return points

    def get_aabb_rect(self, t=-1):
        if t != -1 and t == self.cached_aabb_rect[0]:
            return self.cached_aabb_rect[1]
        
        xmin = float('inf')
        ymin = float('inf')
        xmax = 0
        ymax = 0
        for p in self.get_global_points():
            xmin = min(xmin, p.x)
            ymin = min(ymin, p.y)
            xmax = max(xmax, p.x)
            ymax = max(ymax, p.y)
        w = xmax - xmin
        h = ymax - ymin
        rect = pg.Rect(xmin, ymin, w, h)
        if t != -1:
            self.cached_aabb_rect = (t, rect)
        return rect

    def radius_collision(self, point, t=-1):
        distance_squared = self.centroid(self.get_global_points(t)).distance_squared_to(point)
        return distance_squared <= self.approx_radius ** 2

    def draw(self, screen, t=-1):
        self.universe.draw_poly(screen, self.color, self.get_global_points(t))

    
class Fighter(PolygonalBody):
    def __init__(self, universe, pos, equipment, faction):
        points = (
            vec(0, 15),
            vec(12, -15),
            vec(0, -10),
            vec(-12, -15)
        )
        super().__init__(universe, pos, points, faction)

        self.faction = faction
        self.equipment = equipment

        # attributes to be changed when ship is equiped
        self.rot_speed = 0
        self.fly_speed = 0
        self.acceleration = 0

        self.last_laser_shot = -100
        self.shot_delay = 0
        self.shot_spread = 0
        self.laser_color = BLACK

        self.hp = 0
        self.shields = 0

        self.equip()

    def equip(self):
        self.rot_speed = self.equipment["rot speed"]
        self.fly_speed = self.equipment["fly speed"]
        self.acceleration = self.equipment["acceleration"]
        self.dec = self.equipment["dec"]
        self.shot_delay = self.equipment["shot delay"]
        self.shot_spread = round(self.equipment["shot spread"] * 0.5)
        self.laser_color = self.equipment["laser color"]
        self.hp = self.equipment["hp"]
        self.shields = self.equipment["shields"]

    def fire_laser(self, t):
        if t - self.last_laser_shot > self.shot_delay:
                self.last_laser_shot = t
                l = Laser(self.universe, self.get_global_points(t)[0], self.laser_color, 1)
                l.vel = -vec(0, self.vel.length() + 500).rotate(self.rot + random.randint(-self.shot_spread, self.shot_spread))

    
class PlayerFighter(Fighter):
    def __init__(self, universe, pos, equipment, faction):
        super().__init__(universe, pos, equipment, faction)

    def process(self, dt, t):
        caption = f"Shields at {self.hp}% Coordinates: ({round(self.pos.x)}, {round(self.pos.y)}) Speed: {round(self.vel.length())} px/s)"
        pg.display.set_caption(caption)

        if self.hp <= 0:
            self.color = ORANGE
            return False # do not kill self

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


class AIFighter(Fighter):
    def __init__(self, universe, pos, equipment, faction):
        super().__init__(universe, pos, equipment, faction)

        self.target = None

    def process(self, dt, t):
        if self.hp <= 0:
            self.color = ORANGE
            return False # do not kill self
        closest = None
        closest_distance = 1000000
        for body in self.universe.bodies:
            if closest is None:
                closest = body
            if not isinstance(body, Fighter):
                continue
            if body.faction == self.faction or body.hp <= 0:
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

        if abs(desired_rotation) < 30 and self.target.hp > 0 and self.faction != self.target.faction:
            self.fire_laser(t)

        if self.pos.distance_to(self.target.pos) > 300 and abs(desired_rotation) < 10:
            self.vel += -vec(0, self.acceleration).rotate(self.rot) * dt
        else:
            self.vel = self.vel.lerp(vec(0, 0), self.dec * dt)
        if self.vel.length() > self.fly_speed:
            self.vel = self.vel.normalize() * self.fly_speed

#TODO: move this class elsewhere
class BGStar:
    def __init__(self, universe):
        self.universe = universe
        self.parallax = random.randint(1, 50) * 0.01
        self.size = self.parallax * 4

        self.pos = vec(random.randint(-200000, 200000), random.randint(-150000, 150000))

        self.universe.particles.append(self)

    def draw(self, screen):
        self.universe.draw_circle(screen, WHITE, self.pos, self.size, self.parallax)