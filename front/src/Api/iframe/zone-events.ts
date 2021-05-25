import { EnterLeaveEvent, isEnterLeaveEvent } from '../Events/EnterLeaveEvent'
import { registerWorkadventureCommand, registerWorkadvntureCallback, sendToWorkadventure } from "./iframe-registration"

class WorkadventureZoneCommands {

    onEnterZone(name: string, callback: () => void): void {


    }
    onLeaveZone(name: string, callback: () => void): void {

    }

}




export const commands = registerWorkadventureCommand(new WorkadventureZoneCommands())
export const callbacks = registerWorkadvntureCallback([{
    callback: (enterEvent: EnterLeaveEvent) => {

    },
    type: "enterEvent",
    typeChecker: isEnterLeaveEvent
},])

