import express from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import todoRoutes from "./routes/todoRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import cron from "node-cron";
import prisma from "./prismaClient.js";
import { sendReminderEmail } from "./mailer.js";

const app = express();
const PORT = process.env.PORT || 5003;

// Get the file path from the URL of the current module
const __filename = fileURLToPath(import.meta.url);
// Get the directory name from the file path
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
// Serves the HTML file from the /public directory
// Tells express to serve all files from the public folder as static assets / file. Any requests for the css files will be resolved to the public directory.
app.use(express.static(path.join(__dirname, "../public")));

// Serving up the HTML file from the /public directory
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Routes
app.use("/auth", authRoutes);
app.use("/todos", authMiddleware, todoRoutes);

app.listen(PORT, () => {
  console.log(`Server has started on port: ${PORT}`);
});

cron.schedule("*/5 * * * *", async () => {
  console.log("Running reminder email cron job every 5 minutes");
  // check for todos with deadlines in the next 30 minutes and send reminder emails
  const now = new Date();
  const in30Minutes = new Date(now.getTime() + 30 * 60000);

  const dueTodos = await prisma.todo.findMany({
    where: {
      deadline: {
        gte: now.toISOString(),
        lte: in30Minutes.toISOString(),
      },
      reminderSent: false,
      completed: false,
    },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  for (const todo of dueTodos) {
    const emailText = `Reminder: Your task "${todo.title}" is due on ${new Date(
      todo.deadline
    ).toLocaleString()}. Description: ${todo.description}`;

    sendReminderEmail(todo.user.username, "Task Deadline Reminder", emailText);
    await prisma.todo.update({
      where: { id: todo.id },
      data: { reminderSent: true },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Pause for 1 second between emails
  }
});
