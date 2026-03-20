const express = require("express")
const fs = require("fs")
const path = require("path")

const ADMIN_PASSWORD = "mi_password_super_seguro"
const ADMIN_TOKEN = "gymetra_super_admin_123"

const app = express()

app.use(express.json({ limit: "50mb" }))
app.use(express.static(path.join(__dirname, "public")))

const BASE = path.join(__dirname, "public/meets")
// TEST
app.get("/test", (req, res) => {
    res.send("OK")
})

// LOGIN SIMPLE
app.post("/admin-login", (req, res) => {

    const { password } = req.body

    if (password === ADMIN_PASSWORD) {
        return res.json({ success: true, token: ADMIN_TOKEN })
    }

    res.status(403).json({ success: false })
})

// LISTAR MEETS
app.get("/meets-list", (req, res) => {
    try {
        const items = fs.readdirSync(BASE, { withFileTypes: true })

        const meets = items
            .filter(i => i.isDirectory())
            .map(i => i.name)

        res.json(meets)

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "server error" })
    }
})

// 🔥 SUBIR RESULTADOS (FIX DUPLICADOS)
app.post("/upload-results", (req, res) => {
    try {

        const slug = req.body.slug
        const data = req.body.data || req.body

        // validar slug
        if (!slug) {
            return res.status(400).json({ error: "missing slug" })
        }

        // validar ID del meet
        if (!data.meet || !data.meet.id) {
            return res.status(400).json({ error: "missing meet id" })
        }

        const dir = path.join(BASE, slug)
        const file = path.join(dir, "results.json")

        // 🔍 SI YA EXISTE → VALIDAR ID
        if (fs.existsSync(file)) {

            const existing = JSON.parse(fs.readFileSync(file, "utf8"))

            // ❌ prevenir duplicados peligrosos
            if (existing.meet?.id !== data.meet?.id) {
                return res.status(400).json({
                    error: "This slug already belongs to another meet"
                })
            }

            console.log("Updating meet:", slug)

        } else {
            // 🆕 crear solo si no existe
            fs.mkdirSync(dir, { recursive: true })
            console.log("Creating new meet:", slug)
        }

        // 💾 guardar siempre (update o create)
        fs.writeFileSync(file, JSON.stringify(data, null, 2))

        console.log("Saved:", file)

        res.json({ status: "ok" })

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "server error" })
    }
})

// DELETE MEET
app.delete("/delete-meet/:slug", (req, res) => {
    try {

        const token = req.headers["x-admin-token"]

        if (token !== ADMIN_TOKEN) {
            return res.status(403).json({ error: "unauthorized" })
        }

        const slug = req.params.slug
        const dir = path.join(BASE, slug)

        if (!fs.existsSync(dir)) {
            return res.status(404).json({ error: "not found" })
        }

        fs.rmSync(dir, { recursive: true, force: true })

        console.log("Deleted:", dir)

        res.json({ status: "deleted" })

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "server error" })
    }
})

// START
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log("Server running on", PORT)
})
