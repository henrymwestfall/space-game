import sys

import pygame as pg
from pygame.locals import *

from colors import *
from body import *
from universe import Universe


def main():
    pg.init()
    screen = pg.display.set_mode([900, 600])
    screen_rect = screen.get_rect()
    screen.fill(BLACK)
    clock = pg.time.Clock()

    u = Universe()

    for i in range(10000):
        BGStar(u)


    e = {
        "rot speed": 360,
        "fly speed": 1000,
        "acceleration": 300,
        "dec": 1.0,
        "shot delay": 0.2,
        "hp": 100,
        "laser color": CYAN,
        "shot spread": 2,
        "shields": 0
    }

    f = PlayerFighter(u, vec(450, 300), e, WHITE)
    u.focus = f

    for i in range(3):
        enemy = AIFighter(u, vec(1000 * i, 0), e, RED)
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