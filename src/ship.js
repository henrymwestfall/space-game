import body from "./body.js"
import vec from "./vector.js"
import projectile from "./projectile.js"
import armaments from "./armaments.js"

const DualLaser = armaments.DualLaser
const Laser = projectile.Laser

// TODO: write colors module
const ORANGE = "#FFA600"

class Fighter extends body.PolygonalBody {
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

        this.type = "fighter"

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

    contains(body) {
        return body == this
    }
}


class PlayerFighter extends Fighter {
    constructor(universe, controller, pos, equipment, faction) {
        super(universe, pos, equipment, faction)
        this.controller = controller
    }

    process(dt, t) {
        super.process(dt, t)

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
        super.process(dt, t)

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


class CapitalShip extends body.PolygonalBody {
    constructor(universe, pos, points, engine_bind_points, armament_template, faction) {
        super(universe, pos, points, faction)

        this.faction = faction
        this.engine_bind_points = engine_bind_points
        this.armaments = []
        for (let armament_data of armament_template) {
            let arm = new armament_data[1](this.universe, this, armament_data[0], this.faction)
            this.armaments.push(arm)
            console.log(typeof bind_pos)
        }
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

    process(dt, t) {
        super.process(dt, t)
        if (this.hp <= 0) {
            this.hp = 0
            this.color = "#FFa500"
            this.vel.mix(vec(0, 0), this.dec * dt)
            return false // do not kill self
        }
    }
}

class Corvette extends CapitalShip {
    constructor(universe, pos, faction) {
        let points = [
            vec(0, -75),
            vec(-15, -45),
            vec(-15, 45),
            vec(15, 45),
            vec(15, -45)
        ]
        let engine_points = [
            vec(60, -15),
            vec(60, 15)
        ]
        let armaments = [
            [vec(-15, 0), DualLaser.prototype.constructor],
            [vec(15, 0), DualLaser.prototype.constructor],
            [vec(-15, 30), DualLaser.prototype.constructor],
            [vec(15, 30), DualLaser.prototype.constructor],
            [vec(-15, -30), DualLaser.prototype.constructor],
            [vec(15, -30), DualLaser.prototype.constructor]
        ]
        
        super(universe, pos, points, engine_points, armaments, faction)
    }
}

export default {
    PlayerFighter,
    AIFighter,
    Corvette
}