import vec from "./vector.js"
import Rect from "./rectangle.js"

//var greinerHormann = require('greiner-hormann')

const ORANGE = "#FFA600"

class Body {
    constructor(universe, pos) {
        this.universe = universe
        this.universe.bodies.push(this)

        this.lifetime = 0

        this.pos = pos
        this.vel = vec(0, 0)
        this.rot = 0

        this.chunk = ""

        this.dec = 0
        this.actively_moving = false
    }

    update(dt, t) {
        this.chunk = this.universe.update_chunk_for(this)
        this.lifetime += dt
        let kill = this.process(dt, t)
        if (kill) {
            this.universe.remove_body(this)
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
        return new Rect(xmin, ymin, w, h)
    }

    get_global_side_vectors() {
        let vectors = []
        let last = null
        for (let p of this.get_global_points()) {
            if (last == null) {
                last = p
                continue
            }
        }
    }

    radius_collision(point) {
        let distance = this.pos.clone().subtract(this.centroid(this.points)).distance(point)
        return distance <= this.approx_radius
    }

    draw(context) {
        this.universe.draw_poly(context, this.color, this.get_global_points())
        //let center = this.pos.clone().subtract(this.centroid(this.points))
        //this.universe.draw_circle(context, this.color, center, this.approx_radius, 1, false)
    }
}


class Laser extends CircularBody {
    constructor(universe, parent, pos, color, radius) {
        super(universe, pos, color, radius)
        this.parent = parent

        this.length = 15 * this.radius

        this.exploding = false
        this.exploding_start = null
        this.explosion_life = 0.2

        this.full_life_length = 1.5

        this.first_position = null
    }

    process(dt, t) {
        if (dt == this.lifetime) {
            this.first_position = this.pos.clone()
        }

        if (this.exploding && t - this.exploding_start > this.explosion_life) {
            return true
        }

        if (this.lifetime > dt) {
            this.universe.get_nearby_bodies(this).forEach(body => {
                if ((typeof body.hp !== 'undefined') && body.get_aabb_rect().collide_point(this.pos) && body != this.parent) {
                    if (body.radius_collision(this.pos)) {
                        this.exploding = true
                        this.exploding_start = t
                        this.vel.rotate(Math.random() * Math.PI * 0.25)
                        this.full_life_length = this.lifetime + 0.5
                        body.hp -= 10
                        this.color = ORANGE
                        this.parent = body
                    }
                }
            })

            if (this.lifetime >= this.full_life_length) {
                return true
            }
        }
    }

    draw(context) {
        if (this.exploding) {
            this.universe.draw_circle(context, this.color, this.pos, this.radius * 3)
        } else {
            this.universe.draw_circle(context, this.color, this.pos, this.radius) 
            // draw streak
            const streak_end = this.vel.clone().norm().invert().scaled(this.length).add(this.pos)
            const lerp_amount = 0.3

            if (this.first_position != null) {
                for (let i=0; i<this.length; ++i) {
                    let streak_to_original = this.first_position.clone().subtract(streak_end).norm()
                    let pos_to_original = this.first_position.clone().subtract(this.pos).norm()
                    if (streak_to_original.dot(pos_to_original) == 1 || this.lifetime > this.length / this.vel.length()) {
                        this.universe.draw_circle(context, this.color, streak_end, this.radius)
                    }
                    streak_end.mix(this.pos, lerp_amount)
                }
            }
        }
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
            let l = new Laser(this.universe, this, this.get_global_points()[0], this.laser_color, 3)
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
        if (this.hp <= 0) {
            this.hp = 0
            this.color = "#FFa500"
            this.vel.mix(vec(0, 0), this.dec * dt)
            return false // do not kill self
        }

        // handle turning
        if (this.controller.pressed(this.controller.left)) {
            this.rot -= this.rot_speed * dt
        } else if (this.controller.pressed(this.controller.right)) {
            this.rot += this.rot_speed * dt
        }

        // handle thrust
        if (this.controller.pressed(this.controller.up)) {
            this.vel.subtract(vec(0, this.acceleration).rotate(this.rot).scaled(dt))
            this.actively_moving = true
        } else {
            this.actively_moving = false
        }

        if (this.vel.length() > this.fly_speed) this.vel = this.vel.clone().norm().scaled(this.fly_speed)
        
        // handle space bar press for fire
        if (this.controller.pressed(this.controller.fire)) {
            this.fire_laser(t)
        }
    }
}


class AIFighter extends Fighter {
    constructor(universe, pos, equipment, faction) {
        super(universe, pos, equipment, faction)
        this.target = null
    }

    process(dt, t) {
        if (this.hp <= 0) {
            this.hp = 0
            this.color = "#FFa500"
            this.vel.mix(vec(0, 0), this.dec * dt)
            return false // do not kill self
        }
        let closest = null
        let closest_distance = 10000000
        this.universe.bodies.forEach(body => {
            if (closest === null) {
                closest = body
            }
            let need_continue = false
            if (!(body instanceof Fighter)) need_continue = true
            else if (body.faction === this.faction || body.hp <= 0) need_continue = true

            if (!need_continue) {
                let distance_sq = this.pos.distanceSq(body.pos)
                if (distance_sq < closest_distance) {
                    closest_distance = distance_sq
                    closest = body
                }
            }
        })
        this.target = closest

        if (this.rot < 0) this.rot += 360
        else if (this.rot > 360) this.rot %= 360

        let time = this.target.pos.distance(this.pos) / (this.vel.length() + 500)
        let projection = this.target.pos.clone().add(this.target.vel.scaled(time))

        let desired_angle = vec(0, 1).angle() + projection.subtract(this.pos).angle()
        let desired_rotation = desired_angle - this.rot

        if (desired_rotation < 0) desired_rotation += 2 * Math.PI
        else if (desired_rotation > 2 * Math.PI) desired_rotation -= 2 * Math.PI

        // rotate as much as possible (TODO: fix this)
        let max_rotation_amount = this.rot_speed * dt
        if (max_rotation_amount > desired_rotation) {
            this.rot += desired_rotation
        } else {
            this.rot += max_rotation_amount
        }

        if (desired_rotation < 30 && this.target.hp > 0 && this.faction != this.target.faction) {
            this.fire_laser(t)
        }

        if (this.pos.distance(this.target.pos) > 50 && desired_rotation < 10) {
            this.vel.subtract(vec(0, this.acceleration).rotate(this.rot).scaled(dt))
        } else {
            this.vel.mix(vec(0, 0), this.dec * dt)
        }

        if (this.vel.length() > this.fly_speed) {
            this.vel.normalize().scale_ip(this.fly_speed)
        }
    }
}

export default {
    PolygonalBody,
    CircularBody
}