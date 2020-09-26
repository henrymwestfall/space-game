import Universe from "./universe.js"
import Controller from "./controller.js"
import body from "./body.js"
const PlayerFighter = body.PlayerFighter
const AIFighter = body.AIFighter
import vec from "./vector.js"

const CYAN = "#00FFFF"
const RED = "#FF0000"
const GREEN = "#00FF00"
const BLACK = "#000000"
const WHITE = "#FFFFFF"

class Game {
    constructor(canvas) {
        this.timeOfLastFrame = null
        this.canvas = canvas
        this.ctx = canvas.getContext("2d")
        this.t = 0

        this.universe = new Universe()
        this.controller = new Controller()

        let e = {
            "rot speed": Math.PI * 2,
            "fly speed": 2000,
            "acceleration": 300,
            "dec": 1.0,
            "shot delay": 0.2,
            "hp": 100,
            "laser color": CYAN,
            "shot spread": 2,
            "shields": 0
        }

        let p = new PlayerFighter(this.universe, this.controller, vec(0, 0), e, WHITE)
        this.universe.focus = p

        //new AIFighter(this.universe, vec(-100, -100), e, RED)
        //new AIFighter(this.universe, vec(-200, -200), e, RED)
        //new AIFighter(this.universe, vec(50, 50), e, RED)
    }

    runNextFrame() {
        const dt = this.getElapsedSeconds()
        this.t += dt

        document.getElementById("fps").innerHTML = `FPS: ${Math.round(1 / dt)}`
        document.getElementById("health").innerHTML = `Health: ${this.universe.focus.hp}%`
        document.getElementById("speed").innerHTML = `Speed: ${Math.round(this.universe.focus.vel.length())} px/s`
        document.getElementById("pos").innerHTML = `Coordinates: ${[Math.round(this.universe.focus.pos.x), Math.round(this.universe.focus.pos.y)]}`

        this.universe.update(dt, this.t)
        this.universe.render(this.ctx)
        
        requestAnimationFrame(() => this.runNextFrame())
    }

    getElapsedSeconds() {
        const now = new Date().getTime()
        if (this.timeOfLastFrame == null) {
            var elapsed = 0
        }
        else {
            var elapsed = now - this.timeOfLastFrame
        }
        this.timeOfLastFrame = now
        return elapsed * 0.001 // convert to seconds
    }
}

var game;

window.onload = () => {
    let canvas = document.getElementById("board")
    canvas.width = 900
    canvas.height = 600

    game = new Game(canvas)
    requestAnimationFrame(() => {
        game.runNextFrame()
    })
}