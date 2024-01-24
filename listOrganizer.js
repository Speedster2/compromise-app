class listOrganizer {
  constructor(list = []) {
    this.list = list;
  }

  organize() {
    if (this.list.length < 1 || this.list[0].length < 1) {
      return;
    }
    let first = this.pickFirstIfSame();
    console.log("First: ", first);
    if (first) {
      return first;
    }
    this.removeLastIfSame();
    return this.pickOne();
  }

  pickOne() {
    let newList = [];
    for (let i = 0; i < this.list.length; i++) {
      for (let o = 0; o < this.list[i].length; o++) {
        for (let p = 0; p < this.list[i].length - o; p++) {
          newList.push(this.list[i][o]);
        }
      }
    }
    return newList[Math.floor(Math.random() * newList.length)];
  }

  removeLastIfSame() {
    let howManySame = 0;
    let listLength = this.list[0].length;
    for (let i = 0; i < this.list.length - 1; i++) {
      if (this.list[i][listLength - 1] === this.list[i + 1][listLength - 1]) {
        howManySame++;
      } else {
        howManySame--;
      }
    }
    if (howManySame === this.list.length - 1) {
      this.list.forEach((list) => {
        list = list.slice(0, list.length - 1);
        console.log(list);
      });
      this.removeLastIfSame();
    }
    return false;
  }

  pickFirstIfSame() {
    let amountSame = 0;
    for (let i = 0; i < this.list.length - 1; i++) {
      if (this.list[i][0] === this.list[i + 1][0]) {
        amountSame++;
      } else {
        amountSame--;
      }
    }
    if (amountSame === this.list.length - 1) {
      return this.list[0][0];
    }
    return false;
  }
}

module.exports = { listOrganizer };
