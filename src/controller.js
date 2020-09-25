class Controller {
    constructor() {
        this.keys = {}

        this.left = "ArrowLeft"
        this.right = "ArrowRight"
        this.up = "ArrowUp"
        this.down = "ArrowDown"

        document.addEventListener("keydown", (e) => this.log_keydown(e))
        document.addEventListener("keyup", (e) => this.log_keyup(e))
    }

    log_keydown(e) {
        this.keys[e.code] = true
    }

    log_keyup(e) {
        console.log(e.code)
        this.keys[e.code] = false
    }

    pressed(key_code) {
        if (this.keys[key_code] == undefined) {
            return false
        }
        else {
            return this.keys[key_code]
        }
    }
    
}

export default Controller