//autopublish announcements from announcement channels
import { Events, ChannelType } from 'discord.js';

//announcement channel IDs
const announcementChannels = [
  '1284437242080923795', //Jim announcement
  '1284437246468034580', //Jim stream
  '1109154751637098638', //Nai announcement
];

export const name = Events.MessageCreate;
export /**
 * @param {Message} message
 */
async function execute(message) {
  try {
    //check message exists, & in a valid channel
    if (!message || !message.guild) return;

    //check if the message is in an announcement channel that needs to be crossposted
    if (
      message.channel.type === ChannelType.GuildAnnouncement &&
      announcementChannels.includes(message.channel.id)
    ) {
      //crosspost the message
      setTimeout(async () => {
        try {
          if (message.crosspostable) {
            await message.crosspost();
          }
        } catch (error) {
          console.error('Failed to crosspost message: ', error);
        }
      }, 3000); //3s delay
    }
  } catch (error) {
    console.error('Error on autopublish event: ', error);
  }
}
