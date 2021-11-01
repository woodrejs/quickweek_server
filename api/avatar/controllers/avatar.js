"use strict";

var cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true,
});

module.exports = {
  async create(ctx) {
    const { base64, public_id: oldPublic_id } = ctx.request.body;
    const { id: userID, avatar: avatarID } = ctx.state.user;

    try {
      const { public_id, url } = await cloudinary.uploader.upload(base64);

      if (avatarID && oldPublic_id) {
        //destroy old avatar in cloudinary
        await cloudinary.uploader.destroy(oldPublic_id);
        //update public_id, url in old avatar
        await strapi.services.avatar.update(
          { id: avatarID },
          { public_id, url }
        );
      } else {
        await strapi.services.avatar.create({
          url,
          public_id,
          user: userID,
        });
      }
      return { public_id, url };
    } catch (error) {
      return ctx.response.notFound("Error adding photo.");
    }
  },
  async delete(ctx) {
    const { public_id: oldPublic_id } = ctx.request.body;
    const { avatar: avatarID } = ctx.state.user;

    try {
      await cloudinary.uploader.destroy(oldPublic_id);

      return await strapi.services.avatar.delete({ id: avatarID });
    } catch (error) {
      return ctx.response.notFound("Error while deleting photo.");
    }
  },
};
