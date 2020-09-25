var Vector = require('victor')

Vector.prototype.scale_ip = function(amount) {
    this.x *= amount
    this.y *= amount
}

Vector.prototype.scaled = function(amount) {
    return new Vector(this.x * amount, this.y * amount)
}

function vec(x, y) { return new Vector(x, y) }

export default vec