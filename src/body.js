import vec from "./vector.js"
import Rect from "./rectangle.js"


class Body {
    constructor(universe, pos) {
        this.universe = universe
        this.universe.bodies.push(this)

        this.lifetime = 0

        this.pos = pos
        this.vel = vec(0, 0)
        this.rot = 0

        this.dec = 0
        this.actively_moving = false
    }

    update(dt, t) {
        this.lifetime += t
        let kill = this.process(dt, t)
        if (kill) {
            this.universe.bodies.remove(this)
            delete this
            return
        }
        
        if (!this.actively_moving) this.vel = this.vel.mix(vec(0, 0), this.dec * dt)
        this.pos.add(this.vel.scaled(dt))
    }

    process(dt, t) {
        // Override with  unique  update methods
    }
}


class CircularBody extends Body {
    constructor(universe, pos, color, radius) {
        super(universe, pos)

        this.color = color
        this.radius = radius
    }

    get_aabb_rect() {
        let d = this.radius / 2
        let rect = new Rect(0, 0, d, d)
        rect.set_center(this.pos.x, this.pos.y)
        return rect
    }

    draw(context) {
        this.universe.draw_circle(context, this.color, this.pos, this.radius)
    }
}


class PolygonalBody extends Body {
    constructor(universe, pos, points, color) {
        super(universe, pos)

        this.points = points
        this.center = this.centroid(this.points)
        this.approx_radius = 0
        this.points.forEach(point => {
            this.approx_radius = Math.max(this.approx_radius, this.center.distance(point))
        })
        this.color = color
    }

    centroid(points) {
        let xsum = 0
        let ysum = 0
        points.forEach(point => {
            xsum += point.x
            ysum += point.y
        })
        return vec(xsum / points.size, ysum / points.size)
    }

    get_global_points() {
        let points = []
        this.points.forEach(point => {
            let rotated = point.clone().rotate(this.rot)
            points.push(this.pos.clone().subtract(rotated))
        })
        return points
    }

    get_aabb_rect() {
        let xmin = Number.MAX_SAFE_INTEGER
        let ymin = Number.MAX_SAFE_INTEGER
        let xmax = -Number.MAX_SAFE_INTEGER
        let ymax = -Number.MAX_SAFE_INTEGER
        this.get_global_points().forEach(point => {
            xmin = Math.min(xmin, point.x)
            ymin = Math.min(ymin, point.y)
            xmax = Math.max(xmax, point.x)
            ymax = Math.max(ymax, point.y)
        })
        let w = xmax - xmin
        let h = ymax - ymin
        return Rect(xmin, ymin, w, h)
    }

    radius_collision(point) {
        let distance_sq = this.centroid(this.get_global_points()).distanceSq(point)
        return distance_sq <= this.approx_radius ** 2
    }

    draw(context) {
        this.universe.draw_poly(context, this.color, this.get_global_points())
    }
}


class Fighter extends PolygonalBody {
    constructor(universe, pos, equipment, faction) {
        let points = [
            vec(0, 15),
            vec(12, -15),
            vec(0, -10),
            vec(-12, -15)
        ]
        super(universe, pos, points, faction)

        this.faction = faction
        this.equipment = equipment

        // attributes to be changed when ship is equiped
        this.rot_speed = 0
        this.fly_speed = 0
        this.acceleration = 0

        this.last_laser_shot = -100
        this.shot_delay = 0
        this.shot_spread = 0
        this.laser_color = "#00FFFF"

        this.hp = 0
        this.shields = 0

        this.equip()
    }

    equip() {
        this.rot_speed = this.equipment["rot speed"]
        this.fly_speed = this.equipment["fly speed"]
        this.acceleration = this.equipment["acceleration"]
        this.dec = this.equipment["dec"]
        this.shot_delay = this.equipment["shot delay"]
        this.shot_spread = Math.round(this.equipment["shot spread"] * 0.5)
        this.laser_color = this.equipment["laser color"]
        this.hp = this.equipment["hp"]
        this.shields = this.equipment["shields"]
    }

    fire_laser(t) {
        if (t - this.last_laser_shot > this.shot_delay) {
            this.last_laser_shot = t
            let l = new Laser(this.universe, this.get_global_points()[0], this.laser_color, 1)
            l.vel = vec(0, this.vel.length() + 500).invert().rotate(this.rot) // TODO: add spread
        }
    }

    handle_death(dt, t) {
        if (this.health <= 0) {
            this.health = 0
            this.color = ORANGE
            return true // is dead
        }
        return false // is alive
    }
}


class PlayerFighter extends Fighter {
    constructor(universe, controller, pos, equipment, faction) {
        super(universe, pos, equipment, faction)
        this.controller = controller
    }

    process(dt, t) {
        // if dead, don't do anything else
        if (this.handle_death()) return

        // handle turning
        if (this.controller.pressed(this.controller.left)) {
            this.rot -= this.rot_speed * dt
        }
        else if (this.controller.pressed(this.controller.right)) {
            this.rot += this.rot_speed * dt
        }

        // handle thrust
        if (this.controller.pressed(this.controller.up)) {
            this.vel.subtract(vec(0, this.acceleration).rotate(this.rot).scaled(dt))
            this.actively_moving = true
        }
        else {
            this.actively_moving = false
        }

        if (this.vel.length() > this.fly_speed) this.vel = this.vel.clone().norm().scaled(this.fly_speed)
        
        // TODO: handle 'space' bar press for fire
    }
}

export default PlayerFighter