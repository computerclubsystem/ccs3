export class Logger {
    private output = console;

    log(message: string, ...params: any[]): void {
        this.output.log(this.addTime(message), params);
    }

    error(message: string, ...params: any[]): void {
        this.output.error(this.addTime(message), params);
    }

    private addTime(message: string): string {
        return `${new Date().toISOString()} : ${message}`;
    }
}