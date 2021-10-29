"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const userID = ctx.state.user.id;
    const { id, title, date, type } = ctx.request.body;

    try {
      const termsById = await strapi.query("schedule").find({ uid: id });

      if (!termsById.length) {
        const { _id, uid } = await strapi.services.schedule.create({
          uid: id,
          title,
          date,
          type,
          users: [userID],
        });

        return { _id, id: uid, title, date, type };
      }

      const isDateInArr = termsById.filter(
        (item) => item.date.slice(0, 10) === date.slice(0, 10)
      );

      if (!isDateInArr.length) {
        const { _id, uid } = await strapi.services.schedule.create({
          uid: id,
          title,
          date,
          type,
          users: [userID],
        });

        return { _id, id: uid, title, date, type };
      }

      const termCreate = isDateInArr[0];

      const userInArray = termCreate.users.filter((item) => item.id === userID);

      if (!userInArray.length) {
        const { id, users } = termCreate;
        const { _id, uid } = await strapi.services.schedule.update(
          { id },
          { users: [...users, userID] }
        );

        return { _id, id: uid, title, date, type };
      }

      return ctx.response.notFound("Taki termin już istnieje.");
    } catch (error) {
      return ctx.response.notFound("Błąd podczas dodawania do bazy danych.");
    }
  },
  async delete(ctx) {
    const userID = ctx.state.user.id;
    const { date, id } = ctx.params;

    try {
      const termsById = await strapi.query("schedule").find({ uid: id });

      if (!termsById.length) {
        return ctx.response.notFound("Nie ma takiego wydrzenia.");
      }

      const isDateInArr = termsById.filter(
        (item) => item.date.slice(0, 10) === date.slice(0, 10)
      );

      if (!isDateInArr.length) {
        return ctx.response.notFound("Nie ma takiego terminu.");
      }

      const termToDelete = isDateInArr[0];

      const userInArray = termToDelete.users.filter(
        (item) => item.id === userID
      );

      if (!userInArray.length) {
        return ctx.response.notFound("Nie ma takiego uzytkownika.");
      }

      if (termToDelete.users.length === 1) {
        const { _id, uid, title, date, type } =
          await strapi.services.schedule.delete({
            id: termToDelete.id,
          });

        return { _id, id: uid, title, date, type };
      }

      if (termToDelete.users.length > 1) {
        const filteredUsersArr = termToDelete.users.filter(
          (item) => item.id !== userID
        );

        const { _id, uid, title, date, type } =
          await strapi.services.schedule.update(
            { id: termToDelete.id },
            { users: [...filteredUsersArr] }
          );

        return { _id, id: uid, title, date, type };
      }
    } catch (error) {
      return ctx.response.notFound("Błąd podczas usuwania z bazy danych.");
    }
  },
};
