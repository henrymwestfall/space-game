const Victor = require("victor")

const CYAN = "#00FFFF"
const RED = "#FF0000"
const GREEN = "#00FF00"
const BLACK = "#000000"
const WHITE = "#FFFFFF"

class Laser {
    constructor(pos, color, size) {
        this.color = color
        this.size = size

        this.length = size * 35
        this.pos = pos
        this.vel = Victor(0, 0)
        this.lifetime = 0.0
    }

    update(dt, t) {
        this.lifetime += dt
        let vel_copy = this.vel.clone().multiply(Victor(dt, dt))
        this.pos.x += vel_copy.x
        this.pos.y += vel_copy.y
        if (this.pos.y > 660) {
            this.pos.y = 0
            this.lifetime = 0
        }
    }

    draw(ctx) {
        let vel_copy = this.vel.clone().normalize().multiply(Victor(this.length, this.length))
        let streakEnd = -(vel_copy).add(this.pos)
        console.log(this.vel)
        let last = streakEnd
        let lerp_amount = 0.3
        if (this.lifetime > this.length / this.vel.length()) {
            for (let i=0; i<20; ++i) {
                ctx.beginPath()
                ctx.fillStyle = this.color
                ctx.arc(last.x, last.y, this.size, 0, 2 * Math.PI)
                ctx.fill()

                last = last.mix(this.pos, lerp_amount)
            }
        }
    }
}


class Game {
    constructor(canvas) {
        this.timeOfLastFrame = null
        this.canvas = canvas
        this.ctx = canvas.getContext("2d")
        this.t = 0

        this.lasers = []

        for (let i=0; i<5; ++i) {
            let laser = new Laser(Victor(0, 0), RED, 4)
            laser.vel = Victor(800, 0).rotateByDeg(40 + i * 5)
            this.lasers.push(laser)
            console.log(i)
            console.log(laser.vel)
        }
    }

    update(dt) {
        this.lasers.forEach((laser) => {
            laser.update(dt, this.t)
        })
    }

    render() {
        this.ctx.fillStyle = BLACK
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        this.lasers.forEach((laser) => {
            laser.draw(this.ctx)
        })
    }

    runNextFrame() {
        const dt = this.getElapsedSeconds()

        this.update(dt)
        this.render()
        
        requestAnimationFrame(() => this.runNextFrame())
    }

    getElapsedSeconds() {
        const now = new Date().getTime()
        const elapsed = now - this.timeOfLastFrame
        this.timeOfLastFrame = now
        return elapsed * 0.001 // convert to seconds
    }
}

window.onload = ()=> {
    let canvas = document.getElementById("board")
    canvas.width = 900
    canvas.height = 600

    let game = new Game(canvas)
    requestAnimationFrame(() => {
      game.runNextFrame()
    })
}