const { Authflow } = require("prismarine-auth") 
const { RealmAPI } = require("prismarine-realms")
const fs = require("node:fs")
const input = require("input")
const uuid = require("uuid")
const foods = require("./foods.json")
const mineflayer = require("mineflayer")
require("colors")

async function main() {
    const authflow = new Authflow(uuid.v4())
    const user = await authflow.getMinecraftJavaToken({ fetchProfile: true })
    console.clear()
    console.log("Joueur :", user.profile.name.magenta)
    const minecraftEdition = await input.select("Edition du jeu :", ["Java", "Bedrock"])
    const api = RealmAPI.from(authflow, minecraftEdition.toLowerCase())
    const realms = await api.getRealms()
    if (realms.length === 0) {
        console.log("Aucun realm trouvé")
        return
    } else if (realms.length === 1) {
        const realm = realms[0]
        console.log("? ".green + "Realm : ".bold + realm.name.cyan)
        console.log("Connexion au realm...".yellow)
        connectToRealm(await realm.getAddress(), user)
    } else {
        const realm = await input.select("Realm :", realms.map(r => r.name))
        connectToRealm(await realms.find($realm => $realm.name == realm).getAddress(), user)
        console.log("Connexion au realm...".yellow)
    }

}

function connectToRealm(realm) {
    try {
        const client = mineflayer.createBot({
            auth: "microsoft",
            logErrors: true,
            version: "1.21.4",
            host: realm.host,
            port: realm.port,
        })
        client.on("login", () => {
            console.log("Connecté au realm".green)
            client.chat("Auto-AFK Connecté")
        })
        client.on("death", () => {
            console.log("Joeur mort".red)
        })
        client.on("health", async () => {
            console.log("=====================================")
            console.log("Santé du joueur : " + client.health)
            console.log("Nourriture anté du joueur : " + client.food)
            if (client.food < 20) {
                if (client.heldItem && foods.includes(client.heldItem.name)) {
                    client.activateItem()
                } else {
                    let hasFood = false
                    let food = undefined
                    for (const item of client.inventory.items()) {
                        if (foods.includes(item.name)) {
                            hasFood = true
                            food = item
                            break
                        }
                    }
                    if (hasFood) {
                        await client.equip(food, "hand")
                        client.activateItem()
                    }
                }
            }
            if (client.health < 2) {
                console.log("=====================================")
                client.chat("Joueur en mauvaise posture")
                client.chat("Déconnexion...")
                client.quit()                
            }
        })
        client.on("kicked", (reason) => {
            console.log("=====================================")
            console.log("Expulsé du serveur : " + reason.red)
        })
        client.on("end", () => {
            console.log("=====================================")
            console.log("Déconnexion du serveur".red)
        })
        client.on("error", (error) => {
            console.log("=====================================")
            console.log("Erreur : " + error.red)
            fs.writeFileSync(`error-${Date.now()}.log`, error)
        })
        setInterval(() => {
            client.setControlState("jump", true)
        }, 780000)
    } catch (error) {
        console.error("Erreur de connexion au realm".red)
        console.error(error)
    }
}

main()