import pygame as pg

vec = pg.math.Vector2

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
