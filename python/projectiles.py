import random

import pygame as pg

import body
from colors import *


class Laser(body.CircularBody):
    def __init__(self, universe, pos, color, radius):
        super().__init__(universe, pos, color, radius)

        self.length = 35 * self.radius

        self.exploding = False
        self.exploding_start = None
        self.explosion_life = 0.2

        self.full_life_length = 5

    def process(self, dt, t):
        if self.exploding and t - self.exploding_start > self.explosion_life:
            return True
        
        if self.lifetime > dt:
            for body in self.universe.bodies:
                if not hasattr(body, "hp"):
                    continue

                if not body.get_aabb_rect().collidepoint(self.pos):
                    continue

                if body.radius_collision(self.pos, t):
                    self.exploding = True
                    self.exploding_start = t
                    self.vel.rotate_ip(random.randint(-30, 30))
                    body.hp -= round(7 - self.lifetime)
        
        if self.lifetime >= self.full_life_length:
            return True
    
    def draw(self, screen):
        if self.exploding:
            self.universe.draw_circle(screen, ORANGE, self.pos, self.radius * 5)
            return

        streak_end = -self.vel.normalize() * self.length + self.pos
        last = streak_end
        lerp_amount = 0.3
        if self.lifetime > (self.length / self.vel.length()):
            for i in range(20):
                self.universe.draw_circle(screen, self.color, last, self.radius)
                last = last.lerp(self.pos, lerp_amount)
        else:
            super().draw(screen)