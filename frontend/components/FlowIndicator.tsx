"use client";
type Step = "prepare" | "review" | "analysis" | "record";

type FlowIndicatorProps = {
    activeStep?: Step;
};

const steps: { key: Step; label: string }[] = [
    { key: "prepare", label: "Prepare" },
    { key: "review", label: "Review" },
    { key: "analysis", label: "AI Analysis" },
    { key: "record", label: "On-chain Record" },
];

export default function FlowIndicator({
    activeStep,
}: FlowIndicatorProps) {
    return (
        <div className="my-8 flex flex-col gap-4">
            <div className="flex w-full items-center justify-between">
                {steps.map((step, index) => {
                    const isActive = activeStep === step.key;
                    const isPast = steps.findIndex(s => s.key === activeStep) > index;

                    return (
                        <div key={step.key} className="flex flex-col items-center flex-1">
                            {/* Step Circle */}
                            <div
                                className={[
                                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                                    isActive || isPast
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-border bg-background/60 text-muted",
                                ].join(" ")}
                            >
                                {isPast ? "✓" : index + 1}
                            </div>

                            {/* Step Label */}
                            <p
                                className={[
                                    "mt-2 text-xs font-medium transition-colors",
                                    isActive || isPast ? "text-foreground" : "text-muted",
                                ].join(" ")}
                            >
                                {step.label}
                            </p>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div
                                    className={[
                                        "mt-2 h-1 flex-1 self-stretch transition-all",
                                        isActive || isPast
                                            ? "bg-accent/40"
                                            : "bg-border",
                                    ].join(" ")}
                                    style={{
                                        width: "100%",
                                        maxWidth: "calc(200vw / 3)",
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-muted">
                Complete each step to assess and record your transaction
            </p>
        </div>
    );
}
