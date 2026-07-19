import { useMemo } from "react";
import { useReports } from "@/hooks/api/reports";
import { useProgrammes } from "@/hooks/api/programmes";
import { buildActivityFeed } from "@/lib/activityFeed";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldAlert, Trophy, Megaphone, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const CrowdStream = () => {
  const { data: reports = [] } = useReports();
  const { data: programmes = [] } = useProgrammes();
  const activities = useMemo(() => buildActivityFeed(reports, programmes), [reports, programmes]);

  const getIcon = (type: string) => {
    switch (type) {
      case "submission":
        return <ShieldAlert className="w-4 h-4 text-orange-500" />;
      case "reward":
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case "announcement":
        return <Megaphone className="w-4 h-4 text-blue-500" />;
      case "update":
        return <Activity className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full border-none shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          CrowdStream™
        </CardTitle>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-primary/5 text-primary border-primary/20">
          Live
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune activité récente.</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="group relative flex gap-3 pb-4 last:pb-0">
                {!activity.id.endsWith(activities[activities.length-1].id) && (
                  <div className="absolute left-[9px] top-5 bottom-0 w-[1px] bg-border group-last:hidden" />
                )}
                <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background border border-border shadow-sm">
                  {getIcon(activity.type)}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-foreground leading-none">
                      {activity.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate italic">
                    {activity.subtitle}
                  </p>
                  {activity.hackerName && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                        {activity.hackerName[0]}
                      </div>
                      <span className="text-[10px] font-medium text-primary">
                        {activity.hackerName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
