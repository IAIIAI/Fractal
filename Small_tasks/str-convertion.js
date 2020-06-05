/* Symbol.toPrimitive method usage sample */

let user = {
  name: "Andrew",
  age: "15",
  [Symbol.toPrimitive]: function (hint) {
    if (hint == 'string') {
      return `User ${this.name}, ${this.age} years old`;
    } else {
      return age;
    }
  }
}
alert(user);
