import { createStore } from "solid-js/store"
import axios from "axios"

const [storage, setStorage] = createStore({})
setStorage("addition", JSON.stringify({ a: 1 }))
console.log(JSON.stringify(storage))
