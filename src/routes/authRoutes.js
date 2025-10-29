import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prismaClient.js";

const router = express.Router();

// Register a new user endpoing /auth/register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  // save the username and an irreversibly encrypted password
  // save gilgamesh@gmail.com | aklsdjfasdf.asdf..qwe..q.we...qwe.qw.easd

  // encrypt the password
  const encrypted = bcrypt.hashSync(password, 8);

  // save the new user and hashed password to the db
  try {
    const user = await prisma.user.create({
      data: {
        username,
        password: encrypted,
      },
    });

    // now that we have a user, I want to add their first todo for them
    const defaultTodo = {
      title: "Welcome to your Todo App!",
      description: "This is your first todo. Feel free to edit or delete it.",
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // default deadline is 24 hours from now
    };

    await prisma.todo.create({
      data: {
        title: defaultTodo.title,
        description: defaultTodo.description,
        deadline: defaultTodo.deadline,
        userId: user.id,
      },
    });

    // create a token
    const token = jwt.sign(
      { id: result.lastInsertRowid },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token });
  } catch (err) {
    console.log(err.message);
    res.sendStatus(503);
  }
});

router.post("/login", async (req, res) => {
  // we get their email, and we look up the password associated with that email in the database
  // but we get it back and see it's encrypted, which means that we cannot compare it to the one the user just used trying to login
  // so what we can to do, is again, one way encrypt the password the user just entered

  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    // if we cannot find a user associated with that username, return out from the function
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    // if the password does not match, return out of the function
    if (!passwordIsValid) {
      return res.status(401).send({ message: "Invalid password" });
    }

    // then we have a successful authentication
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ token });
  } catch (err) {
    console.log(err.message);
    res.sendStatus(503);
  }
});

export default router;
