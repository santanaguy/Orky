import {Session, ThumbnailCard, CardImage, Message, IDialogWaterfallStep} from "botbuilder/lib/botbuilder";
import {InvalidOperationException} from "../Errors";
import {IBotService} from "../Services";
import {SessionUtils} from "../Utils";
import {ILogger} from "../Logging";
import {Bot} from "../Models";
import {BotNotFoundException} from "../ServiceErrors";
import BaseDialog from "./BaseDialog";

export class EnableDialog extends BaseDialog {
  private _botService : IBotService;

  constructor(botService: IBotService, triggerRegExp: RegExp, logger: ILogger) {
    super(triggerRegExp, logger);
    this._botService = botService;
  }

  protected buildDialog(): IDialogWaterfallStep {
    return (session: Session) => this.performAction(session);
  }

  private async performAction(session: Session): Promise<void> {
    const incomingMessage = session.message.text || "";
    const match = this._triggerRegExp.exec(incomingMessage);
    if (!match) {
      this._logger.error(`Failed to extract bot name from enable message.  message='${session.message.text}'`);
      session.send("cannot_extract_bot_name");
      return;
    }

    const teamId = SessionUtils.extractTeamId(session);
    if (!teamId) {
      this._logger.error(`Failed to extract team id from enable message. message='${session.message}'`);            
      session.send("cannot_extract_team_id");
      return;
    }
    const botName = match[1];
    let bot: Bot;
    try {
      bot = await this._botService.enableBotWithName(teamId, botName);
    }
    catch (error) {
      if (error instanceof BotNotFoundException) {
        session.send("bot_not_found_error", botName);
        return;
      }
      this._logger.logException(error);
      throw error;
    }

    this._logger.info(`Enabled bot named '${bot.name}' in team '${bot.teamId}'`);
    
    const botCard = new ThumbnailCard(session)
      .title("bot_enabled_title", bot.name)
      .text("bot_enabled_text")
      .images([
        new CardImage(session)
          .url(`${bot.iconUrl}`)
          .alt("bot_avatar_alt_text")
      ]);

    const message = new Message(session).addAttachment(botCard);
    session.send(message);
  }
}
export default EnableDialog;
