"use strict";

const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");

var cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true,
});

const sanitizeUser = (user) =>
  sanitizeEntity(user, {
    model: strapi.query("user", "users-permissions").model,
  });

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  async updateMe(ctx) {
    const advancedConfigs = await strapi
      .store({
        environment: "",
        type: "plugin",
        name: "users-permissions",
        key: "advanced",
      })
      .get();

    const { id } = ctx.state.user;

    let { email, username, password } = ctx.request.body;

    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id,
    });

    if (_.has(ctx.request.body, "email") && !email) {
      return ctx.badRequest("email.notNull");
    }

    if (_.has(ctx.request.body, "username") && !username) {
      return ctx.badRequest("username.notNull");
    }

    if (
      _.has(ctx.request.body, "password") &&
      !password &&
      user.provider === "local"
    ) {
      return ctx.badRequest("password.notNull");
    }

    if (_.has(ctx.request.body, "username")) {
      const userWithSameUsername = await strapi
        .query("user", "users-permissions")
        .findOne({ username });

      if (userWithSameUsername && userWithSameUsername.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.form.error.username.taken",
            message: "username.alreadyTaken.",
            field: ["username"],
          })
        );
      }
    }

    if (_.has(ctx.request.body, "email") && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi
        .query("user", "users-permissions")
        .findOne({ email: email.toLowerCase() });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.form.error.email.taken",
            message: "Email already taken",
            field: ["email"],
          })
        );
      }
      ctx.request.body.email = ctx.request.body.email.toLowerCase();
    }

    let updateData = {
      ...ctx.request.body,
    };

    if (_.has(ctx.request.body, "password") && password === user.password) {
      delete updateData.password;
    }

    const data = await strapi.plugins["users-permissions"].services.user.edit(
      { id },
      updateData
    );

    ctx.send(sanitizeUser(data));
  },
  async destroyMe(ctx) {
    const data = await strapi.plugins["users-permissions"].services.user.fetch({
      id: ctx.state.user.id,
    });

    try {
      const resp = await strapi.plugins[
        "users-permissions"
      ].services.user.remove({ id: data.id });

      if (data.avatar) {
        await cloudinary.uploader.destroy(data.avatar.public_id);
        await strapi.services.avatar.delete({ id: data.avatar.id });
      }

      if (data.schedules && data.schedules.length) {
        const schedulesArr = data.schedules.map((item) => item.id);

        const userSchedules = await strapi
          .query("schedule")
          .find({ id: schedulesArr });

        if (userSchedules && userSchedules.length) {
          await Promise.all(
            userSchedules.map(async ({ id, users }) => {
              if (users.length <= 1) {
                await strapi.services.schedule.delete({
                  id,
                });
              }
              if (users.length > 1) {
                const filteredUsers = users.filter(
                  (user) => user.id !== data.id
                );
                await strapi.services.schedule.update(
                  { id },
                  { users: [...filteredUsers] }
                );
              }
            })
          );
        }
      }

      if (data.favorites && data.favorites.length) {
        const favoritesArr = data.favorites.map((item) => item._id);
        const userFavorites = await strapi
          .query("favorite")
          .find({ _id: favoritesArr });

        if (userFavorites && userFavorites.length) {
          await Promise.all(
            userFavorites.map(async ({ id, users }) => {
              if (users.length <= 1) {
                await strapi.services.favorite.delete({ id });
              }
              if (users.length > 1) {
                const filteredUsers = users.filter(
                  (user) => user.id !== data.id
                );

                await strapi.services.favorite.update(
                  { id },
                  { users: [...filteredUsers] }
                );
              }
            })
          );
        }
      }

      return resp;
    } catch (error) {
      return new Error("Error while deleting the account.");
    }
  },
};
