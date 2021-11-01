"use strict";

module.exports = {
  async create(ctx) {
    const userID = ctx.state.user.id;
    const favID = ctx.request.body.id;

    try {
      const isCreated = await strapi.query("favorite").findOne({ uid: favID });

      if (isCreated) {
        const { id, users } = isCreated;

        await strapi.services.favorite.update(
          { id },
          { users: [...users, userID] }
        );
      } else {
        const { id, img, title, type } = ctx.request.body;

        await strapi.services.favorite.create({
          uid: id,
          img,
          title,
          type,
          users: [userID],
        });
      }
      return ctx.request.body;
    } catch (error) {
      return ctx.response.notFound("There is no such object in the database.");
    }
  },
  async delete(ctx) {
    const userID = ctx.state.user.id;
    const favID = ctx.params.id;

    try {
      const isCreated = await strapi.query("favorite").findOne({ uid: favID });

      if (isCreated) {
        const filteredUsers = isCreated.users.filter(
          (user) => user.id !== userID
        );

        if (filteredUsers.length) {
          await strapi.services.favorite.update(
            { id: isCreated.id },
            { users: [...filteredUsers] }
          );
        } else {
          await strapi.services.favorite.delete({ id: isCreated.id });
        }

        return { id: favID, title: isCreated.title };
      } else {
        return { messsage: "There is no such object in the database." };
      }
    } catch (error) {
      return ctx.response.notFound("Error removing from database.");
    }
  },
  async findByUser(ctx) {
    const { id } = ctx.state.user;

    try {
      const { favorites } = await strapi
        .query("user", "users-permissions")
        .findOne({ id });

      return await Promise.all(
        favorites.map(async ({ id }) => {
          const { uid, img, title, type } = await strapi
            .query("favorite")
            .findOne({ id });
          return { id: uid, img, title, type };
        })
      );
    } catch (error) {
      return ctx.response.notFound("Server error.");
    }
  },
};
