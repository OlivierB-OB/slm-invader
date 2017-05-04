
spaceInvader(window, document.getElementById('space-invader'));

function spaceInvader (window, canvas) {

    var context = canvas.getContext('2d');

    /* GAME */

    function Game () {
        this.message = '';
        this.rebel = [];
        this.republic = [];
        this.other = [];
        this.size = {x: canvas.width, y: canvas.height};
        this.wave = 0;

        this.refresh = function () {
            this.update();
            this.draw();
            requestAnimationFrame(this.refresh);
        }.bind(this);

        this.init();
    }
    Game.MESSAGE_DURATION = 1500;
    Game.prototype.init = function () {
        this.ship = new Ship(this);
        this.addRebel(this.ship);
        this.refresh();
    };
    Game.prototype.update = function () {
        this.handleCollisions();
        this.computeElements();
        this.elements.forEach(Element.update);
        if (!this.rebel.length) {
            this.showText('Game Over!!!', true);
            return;
        }
        if (!this.republic.length) this.createWave();
    };
    Game.prototype.draw = function () {
        context.clearRect(0, 0, this.size.x, this.size.y);
        this.elements.forEach(Element.draw);
        Alien.drawLife(this.republic);
        if (this.message) {
            context.save();
            context.font = '30px Arial';
            context.textAlign='center';
            context.fillStyle = '#FFFFFF';
            context.fillText(this.message, canvas.width / 2, canvas.height / 2);
            context.restore();
        }
    };
    Game.prototype.computeElements = function () {
        this.elements = this.other.concat(this.republic, this.rebel);
    };
    Game.prototype.addRebel = function (element) {
        this.rebel.push(element);
    };
    Game.prototype.addRepublic = function (element) {
        this.republic.push(element);
    };
    Game.prototype.addOther = function (element) {
        this.other.push(element);
    };
    Game.prototype.handleCollisions = function () {
        this.rebel.forEach(function(elementA) {
            this.republic.forEach(function (elementB) {
                if (!Element.colliding(elementA, elementB)) return;
                elementA.life--;
                elementB.life--;
                var sizeA = elementA.size.x * elementA.size.y;
                var sizeB = elementB.size.x * elementB.size.y;
                this.addOther(new Explosion(this, sizeA > sizeB ? elementA.pos : elementB.pos));
            }, this);
        }, this);
        this.republic = this.republic.filter(Element.isAlive);
        this.rebel = this.rebel.filter(Element.isAlive);
        this.other = this.other.filter(Element.isAlive);
        this.republic = this.republic.filter(this.elementInGame, this);
        this.rebel = this.rebel.filter(this.elementInGame, this);
    };
    Game.prototype.elementInGame = function (element) {
        return !(element instanceof Bullet) || (
            element.pos.x + element.halfWidth > 0 &&
            element.pos.x - element.halfWidth < this.size.x &&
            element.pos.y + element.halfHeight > 0 &&
            element.pos.y - element.halfHeight < this.size.x
        );
    };
    Game.prototype.createWave = function () {
        this.ship.life = Ship.MAX_LIFE;
        this.ship.fireRate = Math.max(50, Ship.FIRE_RATE - 50 * this.wave);
        this.wave++;
        this.showText('Wave: ' + this.wave);
        var waveSpeed = Math.ceil(this.wave / 2);
        var waveProb = (999 - this.wave * 2) / 1000;
        var margin = {x: Alien.SIZE.x + 10, y: Alien.SIZE.y + 10};
        for (var i = 0; i < 24; i++) {
            var x = margin.x + (i % 8) * margin.x;
            var y = -200 + (i % 3) * margin.y;
            this.addRepublic(new Alien(this, {x: x, y: y}, waveSpeed, waveProb));
        }
    };
    Game.prototype.showText = function (message, final) {
        this.message = message;
        if (!final) setTimeout(this.showText.bind(this, '', true), Game.MESSAGE_DURATION);
    };

    /* GENERIC ELEMENT */

    function Element (game, pos, size) {
        this.game = game;
        this.pos = pos;
        this.size = size;
        this.halfWidth = Math.floor(this.size.x / 2);
        this.halfHeight = Math.floor(this.size.y / 2);
    }
    Element.update = function (element) {
        element.update();
    };
    Element.draw = function (element) {
        element.draw();
    };
    Element.isAlive = function (element) {
        return element.life > 0;
    };
    Element.colliding = function (elementA, elementB) {
        return !(
            elementA === elementB ||
            elementA.pos.x + elementA.halfWidth < elementB.pos.x - elementB.halfWidth ||
            elementA.pos.y + elementA.halfHeight < elementB.pos.y - elementB.halfHeight ||
            elementA.pos.x - elementA.halfWidth > elementB.pos.x + elementB.halfWidth ||
            elementA.pos.y - elementA.halfHeight > elementB.pos.y + elementB.halfHeight
        );
    };

    /* SHIP */

    function Ship(game) {
        var pos = {
            x: Math.floor(game.size.x / 2) - Math.floor(Ship.SIZE.x / 2),
            y: game.size.y - Math.floor(Ship.SIZE.y / 2)
        };
        Element.call(this, game, pos, Ship.SIZE);
        this.kb = new KeyBoard();
        this.speed = Ship.SPEED;
        this.allowShooting = true;
        this.life = Ship.MAX_LIFE;
        this.fireRate = Ship.FIRE_RATE;
    }
    Ship.SIZE = {x: 67, y: 100};
    Ship.SPEED = 8;
    Ship.MAX_LIFE = 5;
    Ship.FIRE_RATE = 200;
    Ship.prototype.update = function () {
        if (this.kb.isDown(KeyBoard.KEYS.LEFT) && this.pos.x - this.halfWidth > 0) {
            this.pos.x -= this.speed;
        }
        else if (this.kb.isDown(KeyBoard.KEYS.RIGHT) && this.pos.x + this.halfWidth < this.game.size.x) {
            this.pos.x += this.speed;
        }
        if (this.allowShooting && this.kb.isDown(KeyBoard.KEYS.SPACE)) {
            var bullet = new Bullet(
                this.game,
                {x: this.pos.x, y: this.pos.y - this.halfHeight },
                { x: 0, y: -Bullet.SPEED },
                true
            );
            this.game.addRebel(bullet);
            this.toogleShooting();
        }
    };
    Ship.prototype.draw = function () {
        var img = document.getElementById('ship');
        context.save();
        context.translate(this.pos.x - this.halfWidth, this.pos.y - this.halfHeight);
        context.drawImage(img, 0, 0);
        context.restore();
        this.drawLife();
    };
    Ship.prototype.drawLife = function () {
        context.save();
        context.fillStyle = 'white';
        context.fillRect(this.game.size.x -112, 10, 102, 12);
        context.fillStyle = 'red';
        context.fillRect(this.game.size.x -111, 11, this.life * 100 / Ship.MAX_LIFE, 10);
        context.restore();
    };
    Ship.prototype.toogleShooting = function (final) {
        this.allowShooting = !this.allowShooting;
        if (!final) setTimeout(this.toogleShooting.bind(this, true), this.fireRate);
    };

    /* ALIENS */

    function Alien(game, pos, speed, shootProb) {
        Element.call(this, game, pos, Alien.SIZE);
        this.speed = speed;
        this.shootProb = shootProb;
        this.life = 3;
        this.direction = {x: 1, y: 1};
    }
    Alien.SIZE = {x: 50, y: 56};
    Alien.MAX_RANGE = 350;
    Alien.CHDIR_PRO = 0.990;
    Alien.drawLife = function (array) {
        array = array.filter(function (element) {
            return element instanceof Alien;
        });
        context.save();
        context.fillStyle = 'white';
        context.fillRect(10, 10, 10 * array.length + 2, 12);
        array.forEach(function (alien, idx) {
            switch (alien.life) {
                case 3:
                    context.fillStyle = 'green';
                    break;
                case 2:
                    context.fillStyle = 'yellow';
                    break;
                case 1:
                    context.fillStyle = 'red';
                    break;
            }
            context.fillRect(10 * idx + 11, 11, 10, 10);
        });
        context.restore();
    };
    Alien.prototype.update = function () {
        if (this.pos.x - this.halfWidth <= 0) {
            this.direction.x = 1;
        } else if (this.pos.x + this.halfWidth >= this.game.size.x) {
            this.direction.x = -1;
        } else if (Math.random() > Alien.CHDIR_PRO) {
            this.direction.x = -this.direction.x;
        }
        if (this.pos.y - this.halfHeight <= 0) {
            this.direction.y = 1;
        } else if (this.pos.y + this.halfHeight >= Alien.MAX_RANGE) {
            this.direction.y = -1;
        } else if (Math.random() > Alien.CHDIR_PRO) {
            this.direction.y = -this.direction.y;
        }
        this.pos.x += this.speed * this.direction.x;
        this.pos.y += this.speed * this.direction.y;

        if (Math.random() > this.shootProb) {
            var bullet = new Bullet(
                this.game,
                {x: this.pos.x, y: this.pos.y + this.halfHeight },
                { x: Math.random() - 0.5, y: Bullet.SPEED },
                false
            );
            this.game.addRepublic(bullet);
      }
    };
    Alien.prototype.draw = function () {
        var img = document.getElementById('fighter');
        context.save();
        context.translate(this.pos.x + this.halfWidth, this.pos.y + this.halfHeight);
        context.rotate(Math.PI);
        context.drawImage(img, 0, 0);
        context.restore();
    };

    /* BULLET */

    function Bullet(game, pos, direction, isRebel) {
        Element.call(this, game, pos, Bullet.SIZE);
        this.direction = direction;
        this.isRebel = isRebel;
        this.life = 1;

        try {
            var sound = document.getElementById('sound-raygun');
            sound.load();
            sound.play().then(function () {}, function () {});
        }
        catch (e) {
            // only a sound issue
        }
    }
    Bullet.SIZE = {x: 15, y: 16};
    Bullet.SPEED = 3;
    Bullet.prototype.update = function () {
        this.pos.x += this.direction.x;
        this.pos.y += this.direction.y;
    };
    Bullet.prototype.draw = function () {
        context.save();
        var img;
        if (this.isRebel) {
            context.translate(this.pos.x - this.halfWidth, this.pos.y - this.halfHeight);
            img = document.getElementById('rebel-bullet');
        }
        else {
            context.translate(this.pos.x + this.halfWidth, this.pos.y + this.halfHeight);
            img = document.getElementById('republic-bullet');
            context.rotate(Math.PI);
        }
        context.drawImage(img, 0, 0);
        context.restore();
    };

    /* EXPLOSION */

    function Explosion(game, pos) {
        Element.call(this, game, pos, Explosion.SIZE);
        this.life = 1;
        this.date = new Date();

        try {
            var sound = document.getElementById('sound-explosion');
            sound.load();
            sound.play().then(function () {}, function () {});
        }
        catch (e) {
            // only a sound issue
        }
    }
    Explosion.SIZE = {x: 115, y: 100};
    Explosion.DURATION = 150;
    Explosion.prototype.update = function () {
        if (new Date() - this.date > Explosion.DURATION) this.life = 0;
    };
    Explosion.prototype.draw = function () {
        var img = document.getElementById('explosion');
        context.save();
        context.translate(this.pos.x - this.halfWidth, this.pos.y - this.halfHeight);
        context.drawImage(img, 0, 0);
        context.restore();
    };

    /* KEYBOARD HANDLING */

    function KeyBoard() {
        var state = {};
        window.addEventListener('keydown', function(e) {
            state[e.keyCode] = true;
        });
        window.addEventListener('keyup', function(e) {
            state[e.keyCode] = false;
        });
        this.isDown = function (key) {
            return state[key];
        };
    }
    KeyBoard.KEYS = {
        LEFT: 37,
        RIGHT: 39,
        SPACE: 32
    };

    window.addEventListener('load', function() {
        new Game();
    });
}
