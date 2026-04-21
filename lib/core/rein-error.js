import { CLIError } from "@oclif/core/errors";

class ReinError extends CLIError {
  constructor(message, options = {}) {
    super(message, { exit: options.exit ?? 1 });
    this.name = "Error";

    if (options.code) {
      this.code = options.code;
    }

    if (options.details !== undefined) {
      this.details = options.details;
    }
  }

  toJSON() {
    const payload = {
      message: this.message,
      name: this.name,
    };

    if (this.code) {
      payload.code = this.code;
    }

    if (this.details !== undefined) {
      payload.details = this.details;
    }

    if (this.oclif?.exit !== undefined) {
      payload.oclif = { exit: this.oclif.exit };
    }

    return payload;
  }
}

export { ReinError };
